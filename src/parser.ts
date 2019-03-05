import * as path from 'path'
import * as nanomatch from 'nanomatch'
import { EOL } from 'os'
import {
  ExportDeclarationStructure,
  ImportDeclarationStructure,
  Project,
  SourceFile,
  Statement, ts,
  TypeGuards
} from 'ts-morph'
import { sync as resolve } from 'resolve'
import { debug, info, trace, warn } from './logger'
import { Config } from './config'
import { createMatchPath, loadConfig, MatchPath } from 'tsconfig-paths'
import * as readdir from 'recursive-readdir-synchronous'

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
  private config: Config
  private project: Project
  private sourceFiles = new Map<string, SourceFile>()
  private tsResolve?: MatchPath
  private tsConfigFilePath?: string
  private tsResolutionCache = new Map<string, string | undefined>()

  constructor (config: Config) {
    this.config = config
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

  private prepareProject () {
    this.resolveTsConfigPaths()

    this.project = new Project({
      compilerOptions: {
        target: ts.ScriptTarget.Latest,
        noEmit: true,
        skipLibCheck: true,
        allowJs: true
      },
      tsConfigFilePath: this.tsConfigFilePath,
      addFilesFromTsConfig: false,
      skipFileDependencyResolution: true
    })

    info('Searching files...')
    readdir(this.config.directory, [
      this.shouldNotExclude.bind(this)
    ])
      .filter(this.shouldInclude.bind(this))
      .forEach(fullPath => {
        debug(`Adding ${fullPath}`)
        this.sourceFiles.set(fullPath, this.project.addExistingSourceFile(fullPath))
      })

    this.project.resolveSourceFileDependencies()
  }

  private cleanProject () {
    for (const [filepath, sourceFile] of this.sourceFiles.entries()) {
      this.sourceFiles.delete(filepath)
      this.project.removeSourceFile(sourceFile)
    }

    this.tsResolve = undefined
    this.tsConfigFilePath = undefined
    this.sourceFiles.clear()
    this.tsResolutionCache.clear()
  }

  private shouldInclude (filepath: string): boolean {
    return !!nanomatch(path.relative(this.config.directory, filepath), this.config.patterns).length
  }

  private shouldNotExclude (filepath: string): boolean {
    const relativePath = path.relative(this.config.directory, filepath)
    return !!this.config.excludePatterns.length &&
      !!nanomatch(relativePath, this.config.excludePatterns).length
  }

  parse (): Files {
    this.prepareProject()

    info('Parsing', this.sourceFiles.size, 'files')
    const files: Files = {}

    for (const [fullPath, sourceFile] of this.sourceFiles.entries()) {
      const filePath = path.relative(this.config.directory, fullPath)
      const statements = sourceFile.getStatements()

      debug(filePath, statements.length, 'statements')
      const exports = this.getExports(sourceFile, statements)
      const imports = this.getImports(sourceFile, statements)
      debug('-', Object.keys(exports).length, 'exports', Object.keys(imports).length, 'imports')

      files[fullPath] = { exports, imports }
    }

    this.cleanProject()

    return files
  }

  private getImports (sourceFile: SourceFile, statements: Statement[]): Imports {
    return statements.reduce((imports, statement) => {
      let sourceFileImports: string[] | undefined

      if (TypeGuards.isVariableStatement(statement) || TypeGuards.isExpressionStatement(statement)) {
        const text = statement.getText()
        const [match, moduleSpecifier, namedImport] = Array.from(
          REQUIRE_RE.exec(text) || []
        )

        if (moduleSpecifier) {
          sourceFileImports = this.addModule(imports, moduleSpecifier, sourceFile)

          if (sourceFileImports && namedImport) {
            sourceFileImports.push(namedImport)
          }
        }
      } else if (TypeGuards.isImportDeclaration(statement) || TypeGuards.isExportDeclaration(statement)) {
        let moduleSpecifier: string | undefined
        let structure: ImportDeclarationStructure | ExportDeclarationStructure | undefined

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
          sourceFileImports = this.addModule(imports, moduleSpecifier, sourceFile)
        }

        if (sourceFileImports && structure && TypeGuards.isImportDeclaration(statement)) {
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
      }

      return imports
    }, {} as Imports)
  }

  private addImportedFile (importedFile: SourceFile | undefined, imports: Imports): string[] | undefined {
    if (importedFile) {
      const filePath = path.relative(this.config.directory, importedFile.getFilePath())
      if (!imports[filePath]) imports[filePath] = []
      return imports[filePath]
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

  private addModule (imports: Imports, moduleSpecifier: string, sourceFile: SourceFile): string[] | undefined {
    const modulePath = this.getModulePath(moduleSpecifier, sourceFile)

    if (modulePath) {
      if (!imports[modulePath]) {
        imports[modulePath] = []
      }

      return imports[modulePath]
    } else {
      trace('Import not found', sourceFile.getBaseName(), moduleSpecifier)
    }
  }

  private getModulePath (moduleSpecifier: string, sourceFile: SourceFile): string | undefined {
    if (this.tsResolutionCache.has(moduleSpecifier)) {
      return this.tsResolutionCache.get(moduleSpecifier)
    }

    try {
      return resolve(moduleSpecifier, {
        basedir: sourceFile.getDirectoryPath(),
        extensions: this.config.extensions
      })
    } catch (e) {
      const modulePath = this.resolveTsModule(moduleSpecifier)
      this.tsResolutionCache.set(moduleSpecifier, modulePath)
      return modulePath
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
}
