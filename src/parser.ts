import { Project, SourceFile, TypeGuards } from 'ts-morph'
import * as path from 'path'
import * as minimatch from 'minimatch'
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

    debug('Adding directory...')
    this.project.addExistingDirectory(this.config.directory, {
      recursive: true
    })

    debug('Searching files...')
    const filePaths = this.project.getFileSystem()
      .glob(this.config.patterns)
      .filter(filepath =>
        !this.config.excludePatterns.some(glob =>
          minimatch(path.relative(this.config.directory, filepath), glob)
        ))
    trace(filePaths)

    debug(`Adding ${filePaths.length} files...`)
    this.project.addExistingSourceFiles(filePaths).forEach(sourceFile => {
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
    debug('Parsing...')
    const files: Files = {}

    for (const [fullPath, sourceFile] of this.sourceFiles) {
      const filePath = path.relative(this.config.directory, fullPath)

      files[filePath] = {
        exports: this.getExports(sourceFile),
        imports: this.getImports(sourceFile)
      }
    }

    return files
  }

  private getImports (sourceFile: SourceFile): Imports {
    return sourceFile.getStatements().reduce((imports, statement) => {
      let sourceFileImports: string[] | undefined

      if (TypeGuards.isImportDeclaration(statement) || TypeGuards.isExportDeclaration(statement)) {
        const structure = statement.getStructure()
        const moduleSpecifier = structure.moduleSpecifier

        if (moduleSpecifier) {
          const importedFile: SourceFile | undefined =
            statement.getModuleSpecifierSourceFile() ||
            this.resolveModule(moduleSpecifier, sourceFile)

          if (importedFile) {
            const filePath = path.relative(this.config.directory, importedFile.getFilePath())
            sourceFileImports = imports[filePath] = imports[filePath] || []
          } else {
            warn('Import not found', sourceFile.getBaseName(), moduleSpecifier)
          }
        }
      }

      if (TypeGuards.isImportDeclaration(statement) && sourceFileImports) {
        const structure = statement.getStructure()

        if (structure.namespaceImport) {
          sourceFileImports.push(structure.namespaceImport)
        }

        if (structure.defaultImport) {
          sourceFileImports.push(structure.defaultImport)
        }

        if (structure.namedImports instanceof Array) {
          sourceFileImports.push(...structure.namedImports.map(namedImport =>
            typeof namedImport === 'string' ? namedImport : namedImport.name
          ))
        }

        if (!sourceFileImports.length && !structure.namedImports) {
          warn('IMPORT', sourceFile.getBaseName(), structure)
        }
      }

      return imports
    }, {} as Imports)
  }

  private getExports (sourceFile: SourceFile): Exports {
    return sourceFile.getStatements().reduce((exports, statement) => {
      if (TypeGuards.isExportableNode(statement) && statement.isExported()) {
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
          throw new Error()
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
    }
  }

  private resolveTsModule (moduleSpecifier): string | undefined {
    if (!this.tsResolve) return

    warn('Resolve TS', moduleSpecifier)
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
