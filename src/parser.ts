import * as path from "path";
import { EOL } from "os";
import {
  ExportDeclarationStructure,
  ImportDeclarationStructure,
  Project,
  SourceFile,
  Statement,
  TypeGuards
} from "ts-morph";
import { sync as resolve } from "resolve";
import { find, getPaths, debug, info, trace, warn } from "./utils";
import { createMatchPath, loadConfig, MatchPath } from "tsconfig-paths";
import { ComponentSchema, ConfigBase, Exports, Files, Imports } from "./types";
import * as ProgressBar from "progress";

const QUOTES = `(?:'|")`;
const TEXT_INSIDE_QUOTES = `${QUOTES}([^'"]+)${QUOTES}`;
const TEXT_INSIDE_QUOTES_RE = new RegExp(TEXT_INSIDE_QUOTES);
const REQUIRE_RE = new RegExp(
  `require\\(${TEXT_INSIDE_QUOTES}\\)(?:\\.(\\w+))?`
);

export class Parser {
  private readonly config: ConfigBase;
  private project: Project;
  private filePaths: string[] = [];
  private folderPaths: string[] = [];
  private tsResolve?: MatchPath;
  private tsConfigFilePath?: string;

  constructor(config: ConfigBase) {
    this.config = config;
  }

  private resolveTsConfigPaths() {
    const tsConfig = loadConfig(this.config.directory);

    if (tsConfig.resultType === "success") {
      this.tsConfigFilePath = tsConfig.configFileAbsolutePath;
      debug("Found TypeScript config", this.tsConfigFilePath);
      debug("Registering ts-config paths...");
      debug(tsConfig.paths);
      this.tsResolve = createMatchPath(
        tsConfig.absoluteBaseUrl,
        tsConfig.paths,
        tsConfig.mainFields,
        tsConfig.addMatchAll
      );
    } else {
      this.tsResolve = createMatchPath(
        this.config.directory,
        {
          "~/*": ["*"],
          "@/*": ["*", "src/*"]
        },
        undefined,
        true
      );
    }
  }

  private prepareProject() {
    try {
      this.resolveTsConfigPaths();
    } catch (e) {
      warn(e);
      this.tsConfigFilePath = undefined;
    }

    this.project = new Project({
      tsConfigFilePath: this.tsConfigFilePath,
      addFilesFromTsConfig: false,
      skipFileDependencyResolution: true
    });

    const components = this.config.final.components as ComponentSchema[];
    const excludePatterns = [
      ...(this.config.final.excludePatterns as string[])
    ];
    const includePatterns: string[] = [];

    components.forEach(component => {
      includePatterns.push(...component.patterns);

      if (component.excludePatterns) {
        excludePatterns.push(...component.excludePatterns);
      }
    });

    info("Searching files...");
    getPaths(
      this.config.directory,
      "",
      includePatterns,
      excludePatterns
    ).forEach(path => {
      if (path.endsWith("**")) {
        this.folderPaths.push(path);
      } else {
        this.filePaths.push(path);
      }
    });
  }

  private cleanProject() {
    this.tsResolve = undefined;
    this.tsConfigFilePath = undefined;
    this.folderPaths = [];
    this.filePaths = [];
  }

  parse(): Files {
    this.prepareProject();

    const files: Files = {};
    const progress = new ProgressBar("Parsing :bar", {
      clear: true,
      total: this.folderPaths.length + this.filePaths.length,
      width: process.stdout.columns
    });

    info("Parsing", progress.total, "files");

    this.folderPaths.forEach(fullPath => {
      files[fullPath] = { exports: [], imports: {} };
      progress.tick();
    });

    this.filePaths.forEach(fullPath => {
      trace(`Adding ${fullPath}`);

      const sourceFile = this.project.addExistingSourceFile(fullPath);
      const filePath = path.relative(this.config.directory, fullPath);
      const statements = sourceFile.getStatements();

      debug(filePath, statements.length, "statements");
      const exports = this.getExports(sourceFile, statements);
      const imports = this.getImports(sourceFile, statements);
      debug(
        "-",
        Object.keys(exports).length,
        "exports",
        Object.keys(imports).length,
        "imports"
      );

      files[fullPath] = { exports, imports };
      this.project.removeSourceFile(sourceFile);

      progress.tick();
    });

    this.cleanProject();
    progress.terminate();

    return files;
  }

  private getImports(sourceFile: SourceFile, statements: Statement[]): Imports {
    return statements.reduce(
      (imports, statement) => {
        let sourceFileImports: string[] | undefined;

        if (
          TypeGuards.isVariableStatement(statement) ||
          TypeGuards.isExpressionStatement(statement)
        ) {
          const text = statement.getText();
          const [match, moduleSpecifier, namedImport] = Array.from(
            REQUIRE_RE.exec(text) || []
          );

          if (moduleSpecifier) {
            sourceFileImports = this.addModule(
              imports,
              moduleSpecifier,
              sourceFile
            );

            if (sourceFileImports && namedImport) {
              sourceFileImports.push(namedImport);
            }
          }
        } else if (
          TypeGuards.isImportDeclaration(statement) ||
          TypeGuards.isExportDeclaration(statement)
        ) {
          let moduleSpecifier: string | undefined;
          let structure:
            | ImportDeclarationStructure
            | ExportDeclarationStructure
            | undefined;

          try {
            structure = statement.getStructure();
            moduleSpecifier = structure.moduleSpecifier;
          } catch (e) {
            warn(e);
            const brokenLineNumber = statement.getStartLineNumber();
            const brokenLine = sourceFile.getFullText().split(EOL)[
              brokenLineNumber - 1
            ];
            const moduleSpecifierMatch = TEXT_INSIDE_QUOTES_RE.exec(brokenLine);

            if (moduleSpecifierMatch) {
              moduleSpecifier = moduleSpecifierMatch[1];
            }
          }

          if (moduleSpecifier) {
            sourceFileImports = this.addModule(
              imports,
              moduleSpecifier,
              sourceFile
            );
          }

          if (
            sourceFileImports &&
            structure &&
            TypeGuards.isImportDeclaration(statement)
          ) {
            const importStructure = structure as ImportDeclarationStructure;

            if (importStructure.namespaceImport) {
              sourceFileImports.push(importStructure.namespaceImport);
            }

            if (importStructure.defaultImport) {
              sourceFileImports.push(importStructure.defaultImport);
            }

            if (importStructure.namedImports instanceof Array) {
              sourceFileImports.push(
                ...importStructure.namedImports.map(namedImport =>
                  typeof namedImport === "string"
                    ? namedImport
                    : namedImport.name
                )
              );
            }

            if (!sourceFileImports.length && !importStructure.namedImports) {
              warn("IMPORT", sourceFile.getBaseName(), structure);
            }
          }
        }

        return imports;
      },
      {} as Imports
    );
  }

  private getExports(sourceFile: SourceFile, statements: Statement[]): Exports {
    return statements.reduce(
      (exports, statement) => {
        if (
          TypeGuards.isExportableNode(statement) &&
          statement.hasExportKeyword()
        ) {
          if (TypeGuards.isVariableStatement(statement)) {
            try {
              const structure = statement.getStructure();

              exports.push(
                ...structure.declarations.map(declaration => declaration.name)
              );
            } catch (e) {
              warn(e);
              warn(statement.getText());
            }
          } else if (
            TypeGuards.isInterfaceDeclaration(statement) ||
            TypeGuards.isClassDeclaration(statement) ||
            TypeGuards.isEnumDeclaration(statement) ||
            TypeGuards.isTypeAliasDeclaration(statement)
          ) {
            try {
              const structure = statement.getStructure();

              if (structure.name) {
                exports.push(structure.name);
              }
            } catch (e) {
              warn(e);
              warn(statement.getText());
            }
          } else if (TypeGuards.isFunctionDeclaration(statement)) {
            try {
              const structure = statement.getStructure();
              trace("EXPORT", sourceFile.getBaseName(), structure);
            } catch (e) {
              warn(e);
              warn(statement.getText());
            }
          } else {
            warn("EXPORT Unknown type", sourceFile.getBaseName(), statement);
          }
        }

        return exports;
      },
      [] as Exports
    );
  }

  private addModule(
    imports: Imports,
    moduleSpecifier: string,
    sourceFile: SourceFile
  ): string[] | undefined {
    const modulePath = this.getModulePath(moduleSpecifier, sourceFile);

    if (modulePath) {
      const folder = find(modulePath, this.folderPaths);
      const realModulePath = folder || modulePath;

      if (!imports[realModulePath]) {
        imports[realModulePath] = [];
      }

      return imports[realModulePath];
    } else {
      trace("Import not found", sourceFile.getBaseName(), moduleSpecifier);
    }
  }

  private getModulePath(
    moduleSpecifier: string,
    sourceFile: SourceFile
  ): string | undefined {
    try {
      trace(
        moduleSpecifier,
        sourceFile.getDirectoryPath(),
        this.config.extensions
      );
      return resolve(moduleSpecifier, {
        basedir: sourceFile.getDirectoryPath(),
        extensions: this.config.extensions
      });
    } catch (e) {
      return this.resolveTsModule(moduleSpecifier);
    }
  }

  private resolveTsModule(moduleSpecifier): string | undefined {
    if (!this.tsResolve) return;

    const modulePath = this.tsResolve(
      moduleSpecifier,
      undefined,
      undefined,
      this.config.extensions
    );
    debug("Resolve TS", moduleSpecifier, modulePath);

    if (!modulePath) return;

    for (const ext of this.config.extensions) {
      const fullPath = `${modulePath}${ext}`;

      if (this.filePaths.includes(fullPath)) {
        return fullPath;
      }
    }
  }
}
