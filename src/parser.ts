import * as path from 'path'
import { EOL } from 'os'
import {
  ExportDeclarationStructure,
  ImportDeclarationStructure,
  Project,
  SourceFile,
  Statement,
  ts,
  TypeGuards
} from 'ts-morph'
import { sync as resolve } from 'resolve'
import { find, getPaths, debug, info, trace, warn } from './utils'
import { createMatchPath, loadConfig, MatchPath } from 'tsconfig-paths'
import { ConfigBase, Exports, Files, Imports } from './types'

const QUOTES = `(?:'|")`
const TEXT_INSIDE_QUOTES = `${QUOTES}([^'"]+)${QUOTES}`
const TEXT_INSIDE_QUOTES_RE = new RegExp(TEXT_INSIDE_QUOTES)
const REQUIRE_RE = new RegExp(`require\\(${TEXT_INSIDE_QUOTES}\\)(?:\\.(\\w+))?`)

export class Parser {
  private config: ConfigBase
  private project: Project
  private sourceFiles = new Map<string, SourceFile>()
  private sourceFolders: string[] = []
  private tsResolve?: MatchPath
  private tsConfigFilePath?: string

  constructor (config: ConfigBase) {
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
    getPaths(
      this.config.directory,
      '',
      this.config.patterns,
      this.config.excludePatterns
    ).forEach(fullPath => {
      trace(`Adding ${fullPath}`)
      if (fullPath.endsWith('**')) {
        this.sourceFolders.push(fullPath)
      } else {
        this.sourceFiles.set(fullPath, this.project.addExistingSourceFile(fullPath))
      }
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
    this.sourceFolders = []
  }

  parse (): Files {
    this.resolveTsConfigPaths()
    this.prepareProject()

    info('Parsing', this.sourceFiles.size, 'files')
    const files: Files = {}

    for (const fullPath of this.sourceFolders) {
      files[fullPath] = { exports: [], imports: {} }
    }

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

  private getExports (sourceFile: SourceFile, statements: Statement[]): Exports {
    return statements.reduce((exports, statement) => {
      if (TypeGuards.isExportableNode(statement) && statement.hasExportKeyword()) {
        if (TypeGuards.isVariableStatement(statement)) {
          try {
            const structure = statement.getStructure()

            exports.push(
              ...structure.declarations.map(declaration => declaration.name)
            )
          } catch (e) {
            warn(e)
            warn(statement.getText())
          }
        } else if (
          TypeGuards.isInterfaceDeclaration(statement) ||
          TypeGuards.isClassDeclaration(statement) ||
          TypeGuards.isEnumDeclaration(statement) ||
          TypeGuards.isTypeAliasDeclaration(statement)
        ) {
          try {
            const structure = statement.getStructure()

            if (structure.name) {
              exports.push(structure.name)
            }
          } catch (e) {
            warn(e)
            warn(statement.getText())
          }
        } else if (TypeGuards.isFunctionDeclaration(statement)) {
          try {
            const structure = statement.getStructure()
            trace('EXPORT', sourceFile.getBaseName(), structure)
          } catch (e) {
            warn(e)
            warn(statement.getText())
          }
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
      const folder = find(modulePath, this.sourceFolders)
      const realModulePath = folder || modulePath

      if (!imports[realModulePath]) {
        imports[realModulePath] = []
      }

      return imports[realModulePath]
    } else {
      trace('Import not found', sourceFile.getBaseName(), moduleSpecifier)
    }
  }

  private getModulePath (moduleSpecifier: string, sourceFile: SourceFile): string | undefined {
    try {
      trace(moduleSpecifier, sourceFile.getDirectoryPath(), this.config.extensions)
      return resolve(moduleSpecifier, {
        basedir: sourceFile.getDirectoryPath(),
        extensions: this.config.extensions
      })
    } catch (e) {
      return this.resolveTsModule(moduleSpecifier)
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
