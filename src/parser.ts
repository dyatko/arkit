import { EOL } from "os";
import {
  ExportDeclarationStructure,
  ImportDeclarationStructure,
  SourceFile,
  Statement,
  TypeGuards
} from "ts-morph";
import { find, debug, info, trace, warn } from "./utils";
import { ConfigBase, Exports, File, Files, Imports } from "./types";
import * as ProgressBar from "progress";
import { FileSystem } from "./filesystem";

const QUOTES = `(?:'|")`;
const TEXT_INSIDE_QUOTES = `${QUOTES}([^'"]+)${QUOTES}`;
const TEXT_INSIDE_QUOTES_RE = new RegExp(TEXT_INSIDE_QUOTES);
const REQUIRE_RE = new RegExp(
  `require\\(${TEXT_INSIDE_QUOTES}\\)(?:\\.(\\w+))?`
);

export class Parser {
  private readonly fs: FileSystem;

  constructor(config: ConfigBase) {
    this.fs = new FileSystem(config);
  }

  parse(): Files {
    const files: Files = {};
    const progress = new ProgressBar("Parsing :bar", {
      clear: true,
      total: this.fs.folderPaths.length + this.fs.filePaths.length,
      width: process.stdout.columns
    });

    info("Parsing", progress.total, "files");

    this.fs.folderPaths.forEach(fullPath => {
      files[fullPath] = { exports: [], imports: {} };
      progress.tick();
    });

    this.fs.filePaths.forEach(fullPath => {
      files[fullPath] = this.parseFile(fullPath);
      progress.tick();
    });

    progress.terminate();

    return files;
  }

  private parseFile(fullPath: string): File {
    trace(`Parsing ${fullPath}`);

    const sourceFile = this.fs.project.addExistingSourceFile(fullPath);
    const statements = sourceFile.getStatements();

    debug(fullPath, statements.length, "statements");
    const exports = this.getExports(sourceFile, statements);
    const imports = this.getImports(sourceFile, statements);
    debug(
      "-",
      Object.keys(exports).length,
      "exports",
      Object.keys(imports).length,
      "imports"
    );

    this.fs.project.removeSourceFile(sourceFile);
    return { exports, imports };
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
    const modulePath = this.fs.getModulePath(moduleSpecifier, sourceFile);

    if (modulePath) {
      const folder = find(modulePath, this.fs.folderPaths);
      const realModulePath = folder || modulePath;

      if (!imports[realModulePath]) {
        imports[realModulePath] = [];
      }

      return imports[realModulePath];
    } else {
      trace("Import not found", sourceFile.getBaseName(), moduleSpecifier);
    }
  }
}
