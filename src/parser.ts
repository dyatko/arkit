import * as fs from 'fs'
import * as path from 'path'
import * as nanomatch from 'nanomatch'
import { EOL } from 'os'
import {
  ExportDeclarationStructure,
  ImportDeclarationStructure,
  Project,
  SourceFile,
  Statement,
  TypeGuards
} from 'ts-morph'
import { sync as resolve } from 'resolve'
import { debug, trace, warn } from './logger'
import { Config } from './config'
import { loadConfig, createMatchPath, MatchPath } from 'tsconfig-paths'

interface Imports {
  [file: string]: string[]
}

interface Exports extends Array<string> {
}

export interface File {
  imports: Imports
  exports: Exports
}

export interface Files {
  [file: string]: File
}

const QUOTES = `(?:'|")`
const TEXT_INSIDE_QUOTES = `${QUOTES}([^'"]+)${QUOTES}`
const TEXT_INSIDE_QUOTES_RE = new RegExp(TEXT_INSIDE_QUOTES)
const REQUIRE_RE = new RegExp(`require\\(${TEXT_INSIDE_QUOTES}\\)(?:\\.(\\w+))?`)

export class Parser {
  private project: Project
  private sourceFiles = new Map<string, SourceFile>()
  private tsResolve?: MatchPath
  private tsConfigFilePath?: string
  private tsResolutionCache = new Map<string, string | undefined>()

  constructor (
    private config: Config
  ) {
    this.resolveTsConfigPaths()

    this.project = new Project({
      tsConfigFilePath: this.tsConfigFilePath,
      addFilesFromTsConfig: false
    })

    debug('Adding directory...', this.config.directory)
    this.project.addExistingDirectory(this.config.directory)

    debug('Searching files...')
    const allFilePaths = this.walkSync(this.config.directory)
      .map(filepath => path.relative(this.config.directory, filepath))
    const suitableFilePaths = nanomatch(allFilePaths, this.config.patterns, { ignore: this.config.excludePatterns })
      .map(filepath => path.join(this.config.directory, filepath))
    trace(suitableFilePaths)

    debug(`Adding ${suitableFilePaths.length} files...`)
    this.project.addExistingSourceFiles(suitableFilePaths).forEach(sourceFile => {
      this.sourceFiles.set(sourceFile.getFilePath(), sourceFile)
    })
  }

  private resolveTsConfigPaths () {
    const tsConfig = loadConfig(this.config.directory)

    if (tsConfig.resultType === 'success') {
      this.tsConfigFilePath = path.relative(this.config.directory, tsConfig.configFileAbsolutePath)
      debug('Found TypeScript config', this.tsConfigFilePath)
      debug('Registering ts-config paths...')
      this.tsResolve = createMatchPath(
        tsConfig.absoluteBaseUrl,
        tsConfig.paths,
        tsConfig.mainFields,
        tsConfig.addMatchAll
      )
      debug(tsConfig.paths)
    }
  }

  parse (): Files {
    debug('Parsing...', this.sourceFiles.size, 'files')
    const files: Files = {}

    for (const [fullPath, sourceFile] of this.sourceFiles) {
      const filePath = path.relative(this.config.directory, fullPath)
      const statements = sourceFile.getStatements()
      debug(filePath, statements.length, 'statements')
      const exports = this.getExports(sourceFile, statements)
      const imports = this.getImports(sourceFile, statements)

      debug(Object.keys(exports).length, 'exports', Object.keys(imports).length, 'imports')
      files[filePath] = { exports, imports }
    }

    return files
  }

  private getImports (sourceFile: SourceFile, statements: Statement[]): Imports {
    return statements.reduce((imports, statement) => {
      let sourceFileImports: string[] | undefined
      let structure: ImportDeclarationStructure | ExportDeclarationStructure | undefined

      if (TypeGuards.isVariableStatement(statement)) {
        statement.getStructure().declarations.forEach(declaration => {
          if (typeof declaration.initializer === 'string') {
            const [match, moduleSpecifier, namedImport] = Array.from(
              REQUIRE_RE.exec(declaration.initializer) || []
            )

            if (moduleSpecifier) {
              const importedFile: SourceFile | undefined = this.resolveModule(moduleSpecifier, sourceFile)
              sourceFileImports = this.addImportedFile(importedFile, imports)

              if (sourceFileImports && namedImport) {
                sourceFileImports.push(namedImport)
              }
            }
          }
        })
      }

      if (TypeGuards.isImportDeclaration(statement) || TypeGuards.isExportDeclaration(statement)) {
        let moduleSpecifier: string | undefined

        try {
          structure = statement.getStructure()
          moduleSpecifier = structure.moduleSpecifier
        } catch (e) {
          warn(e)
          const brokenLineNumber = statement.getStartLineNumber()
          const brokenLine = sourceFile.getFullText().split(EOL)[brokenLineNumber - 1]
          const moduleSpecifierMatch = TEXT_INSIDE_QUOTES_RE.exec(brokenLine)

          if (moduleSpecifierMatch) {
            moduleSpecifier = moduleSpecifierMatch[1]
          }
        }

        if (moduleSpecifier) {
          const importedFile: SourceFile | undefined =
            (structure && statement.getModuleSpecifierSourceFile()) ||
            this.resolveModule(moduleSpecifier, sourceFile)

          sourceFileImports = this.addImportedFile(importedFile, imports)
        }
      }

      if (TypeGuards.isImportDeclaration(statement) && sourceFileImports && structure) {
        const importStructure = structure as ImportDeclarationStructure

        if (importStructure.namespaceImport) {
          sourceFileImports.push(importStructure.namespaceImport)
        }

        if (importStructure.defaultImport) {
          sourceFileImports.push(importStructure.defaultImport)
        }

        if (importStructure.namedImports instanceof Array) {
          sourceFileImports.push(...importStructure.namedImports.map(namedImport =>
            typeof namedImport === 'string' ? namedImport : namedImport.name
          ))
        }

        if (!sourceFileImports.length && !importStructure.namedImports) {
          warn('IMPORT', sourceFile.getBaseName(), structure)
        }
      }

      return imports
    }, {} as Imports)
  }

  private addImportedFile (importedFile: SourceFile | undefined, imports: Imports): string[] | undefined {
    if (importedFile) {
      const filePath = path.relative(this.config.directory, importedFile.getFilePath())
      return imports[filePath] = imports[filePath] || []
    }
  }

  private getExports (sourceFile: SourceFile, statements: Statement[]): Exports {
    return statements.reduce((exports, statement) => {
      if (TypeGuards.isExportableNode(statement) && statement.hasExportKeyword()) {
        if (TypeGuards.isVariableStatement(statement)) {
          const structure = statement.getStructure()

          exports = [
            ...exports,
            structure.declarations.map(declaration => declaration.name)
          ]
        } else if (
          TypeGuards.isInterfaceDeclaration(statement) ||
          TypeGuards.isClassDeclaration(statement) ||
          TypeGuards.isEnumDeclaration(statement) ||
          TypeGuards.isFunctionDeclaration(statement) ||
          TypeGuards.isTypeAliasDeclaration(statement)
        ) {
          trace('EXPORT', sourceFile.getBaseName(), statement.getStructure())
        } else {
          warn('EXPORT Unknown type', sourceFile.getBaseName(), statement)
        }
      }

      return exports
    }, [] as Exports)
  }

  private resolveModule (moduleSpecifier: string, sourceFile: SourceFile): SourceFile | undefined {
    let modulePath: string | undefined

    if (!this.tsResolutionCache.has(moduleSpecifier)) {
      try {
        modulePath = resolve(moduleSpecifier, {
          basedir: sourceFile.getDirectoryPath(),
          extensions: this.config.extensions
        })
      } catch (e) {
        modulePath = this.resolveTsModule(moduleSpecifier)
        this.tsResolutionCache.set(moduleSpecifier, modulePath)
      }
    } else {
      modulePath = this.tsResolutionCache.get(moduleSpecifier)
    }

    if (modulePath) {
      return this.sourceFiles.get(modulePath)
    } else {
      trace('Import not found', sourceFile.getBaseName(), moduleSpecifier)
    }
  }

  private resolveTsModule (moduleSpecifier): string | undefined {
    if (!this.tsResolve) return

    trace('Resolve TS', moduleSpecifier)
    const modulePath = this.tsResolve(moduleSpecifier)

    if (!modulePath) return

    for (const ext of this.config.extensions) {
      const fullPath = `${modulePath}${ext}`

      if (this.sourceFiles.has(fullPath)) {
        return fullPath
      }
    }
  }

  private walkSync (p: string): string[] {
    if (fs.statSync(p).isDirectory()) {
      return fs.readdirSync(p).reduce(
        (paths, f) => [...paths, ...this.walkSync(path.join(p, f))]
      , [] as string[])
    } else {
      return [ p ]
    }
  }
}
