"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const os_1 = require("os");
const ts_morph_1 = require("ts-morph");
const utils_1 = require("./utils");
const progress_1 = __importDefault(require("progress"));
const filesystem_1 = require("./filesystem");
const QUOTES = `(?:'|")`;
const TEXT_INSIDE_QUOTES = `${QUOTES}([^'"]+)${QUOTES}`;
const TEXT_INSIDE_QUOTES_RE = new RegExp(TEXT_INSIDE_QUOTES);
const REQUIRE_RE = new RegExp(`require\\(${TEXT_INSIDE_QUOTES}\\)(?:\\.(\\w+))?`);
class Parser {
    constructor(config) {
        this.fs = new filesystem_1.FileSystem(config);
    }
    parse() {
        const files = {};
        const progress = new progress_1.default("Parsing :bar", {
            clear: true,
            total: this.fs.folderPaths.length + this.fs.filePaths.length,
            width: process.stdout.columns,
        });
        (0, utils_1.info)("Parsing", progress.total, "files");
        this.fs.folderPaths.forEach((fullPath) => {
            files[fullPath] = { exports: [], imports: {} };
            progress.tick();
        });
        this.fs.filePaths.forEach((fullPath) => {
            try {
                files[fullPath] = this.parseFile(fullPath);
            }
            catch (e) {
                (0, utils_1.error)(`Error parsing ${fullPath}: ${e.message}`);
                (0, utils_1.trace)(e);
            }
            progress.tick();
        });
        progress.terminate();
        return files;
    }
    parseFile(fullPath) {
        (0, utils_1.trace)(`Parsing ${fullPath}`);
        const sourceFile = this.fs.project.addSourceFileAtPath(fullPath);
        const rootStatements = sourceFile.getStatements();
        const allStatements = (0, utils_1.getAllStatements)(rootStatements);
        (0, utils_1.debug)(fullPath, allStatements.length, "statements");
        const exports = this.getExports(sourceFile, rootStatements);
        const imports = this.getImports(sourceFile, allStatements);
        (0, utils_1.debug)("-", Object.keys(exports).length, "exports", Object.keys(imports).length, "imports");
        this.fs.project.removeSourceFile(sourceFile);
        return { exports, imports };
    }
    getImports(sourceFile, statements) {
        return statements.reduce((imports, statement) => {
            let sourceFileImports;
            if (ts_morph_1.Node.isImportTypeNode(statement)) {
                try {
                    const argument = statement.getArgument();
                    const moduleSpecifier = eval(argument.getText());
                    sourceFileImports = this.addModule(imports, moduleSpecifier, sourceFile);
                    const namedImport = statement.getQualifier();
                    if (sourceFileImports && namedImport) {
                        sourceFileImports.push(namedImport.getText());
                    }
                }
                catch (e) {
                    (0, utils_1.warn)(e);
                }
            }
            else if (ts_morph_1.Node.isVariableStatement(statement) ||
                ts_morph_1.Node.isExpressionStatement(statement)) {
                const text = statement.getText();
                const [match, moduleSpecifier, namedImport] = Array.from(REQUIRE_RE.exec(text) || []);
                if (moduleSpecifier) {
                    sourceFileImports = this.addModule(imports, moduleSpecifier, sourceFile);
                    if (sourceFileImports && namedImport) {
                        sourceFileImports.push(namedImport);
                    }
                }
            }
            else if (ts_morph_1.Node.isImportDeclaration(statement) ||
                ts_morph_1.Node.isExportDeclaration(statement)) {
                let moduleSpecifier;
                let structure;
                try {
                    structure = statement.getStructure();
                    moduleSpecifier = structure.moduleSpecifier;
                }
                catch (e) {
                    (0, utils_1.warn)(e);
                    const brokenLineNumber = statement.getStartLineNumber();
                    const brokenLine = sourceFile.getFullText().split(os_1.EOL)[brokenLineNumber - 1];
                    const moduleSpecifierMatch = TEXT_INSIDE_QUOTES_RE.exec(brokenLine);
                    if (moduleSpecifierMatch) {
                        moduleSpecifier = moduleSpecifierMatch[1];
                    }
                }
                if (moduleSpecifier) {
                    sourceFileImports = this.addModule(imports, moduleSpecifier, sourceFile);
                }
                if (sourceFileImports &&
                    structure &&
                    ts_morph_1.Node.isImportDeclaration(statement)) {
                    const importStructure = structure;
                    if (importStructure.namespaceImport) {
                        sourceFileImports.push(importStructure.namespaceImport);
                    }
                    if (importStructure.defaultImport) {
                        sourceFileImports.push(importStructure.defaultImport);
                    }
                    if (importStructure.namedImports instanceof Array) {
                        sourceFileImports.push(...importStructure.namedImports.map((namedImport) => typeof namedImport === "string"
                            ? namedImport
                            : namedImport.name));
                    }
                    if (!sourceFileImports.length && !importStructure.namedImports) {
                        (0, utils_1.warn)("IMPORT", sourceFile.getBaseName(), structure);
                    }
                }
            }
            return imports;
        }, {});
    }
    getExports(sourceFile, statements) {
        return statements.reduce((exports, statement) => {
            const hasExport = ts_morph_1.Node.isExportable(statement) &&
                statement.getText().trimStart().startsWith("export");
            if (hasExport) {
                if (ts_morph_1.Node.isVariableStatement(statement)) {
                    try {
                        const structure = statement.getStructure();
                        exports.push(...structure.declarations.map((declaration) => String(declaration.name)));
                    }
                    catch (e) {
                        (0, utils_1.warn)(e);
                        (0, utils_1.warn)("isVariableStatement", statement.getText());
                    }
                }
                else if (ts_morph_1.Node.isInterfaceDeclaration(statement) ||
                    ts_morph_1.Node.isClassDeclaration(statement) ||
                    ts_morph_1.Node.isEnumDeclaration(statement) ||
                    ts_morph_1.Node.isTypeAliasDeclaration(statement)) {
                    try {
                        const structure = statement.getStructure();
                        if (structure.name) {
                            exports.push(String(structure.name));
                        }
                    }
                    catch (e) {
                        (0, utils_1.warn)(e);
                        (0, utils_1.warn)("isInterfaceDeclaration, ...", statement.getText());
                    }
                }
                else if (ts_morph_1.Node.isFunctionDeclaration(statement)) {
                    try {
                        const structure = statement.getStructure();
                        (0, utils_1.trace)("EXPORT", sourceFile.getBaseName(), structure);
                    }
                    catch (e) {
                        (0, utils_1.warn)(e);
                        (0, utils_1.warn)("isFunctionDeclaration", statement.getText());
                    }
                }
                else {
                    (0, utils_1.warn)("EXPORT Unknown type", sourceFile.getBaseName(), statement);
                }
            }
            return exports;
        }, []);
    }
    addModule(imports, moduleSpecifier, sourceFile) {
        const modulePath = this.fs.getModulePath(moduleSpecifier, sourceFile);
        if (modulePath) {
            const folder = (0, utils_1.find)(modulePath, this.fs.folderPaths);
            const realModulePath = folder || modulePath;
            if (!imports[realModulePath]) {
                imports[realModulePath] = [];
            }
            return imports[realModulePath];
        }
        else {
            (0, utils_1.trace)("Import not found", sourceFile.getBaseName(), moduleSpecifier);
        }
    }
}
exports.Parser = Parser;
