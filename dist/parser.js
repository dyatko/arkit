"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const os_1 = require("os");
const ts_morph_1 = require("ts-morph");
const resolve_1 = require("resolve");
const utils_1 = require("./utils");
const tsconfig_paths_1 = require("tsconfig-paths");
const ProgressBar = require("progress");
const QUOTES = `(?:'|")`;
const TEXT_INSIDE_QUOTES = `${QUOTES}([^'"]+)${QUOTES}`;
const TEXT_INSIDE_QUOTES_RE = new RegExp(TEXT_INSIDE_QUOTES);
const REQUIRE_RE = new RegExp(`require\\(${TEXT_INSIDE_QUOTES}\\)(?:\\.(\\w+))?`);
class Parser {
    constructor(config) {
        this.filePaths = [];
        this.folderPaths = [];
        this.config = config;
    }
    resolveTsConfigPaths() {
        const tsConfig = tsconfig_paths_1.loadConfig(this.config.directory);
        if (tsConfig.resultType === "success") {
            this.tsConfigFilePath = path.relative(this.config.directory, tsConfig.configFileAbsolutePath);
            utils_1.debug("Found TypeScript config", this.tsConfigFilePath);
            utils_1.debug("Registering ts-config paths...");
            utils_1.debug(tsConfig.paths);
            this.tsResolve = tsconfig_paths_1.createMatchPath(tsConfig.absoluteBaseUrl, tsConfig.paths, tsConfig.mainFields, tsConfig.addMatchAll);
        }
        else {
            this.tsResolve = tsconfig_paths_1.createMatchPath(this.config.directory, {
                "~/*": ["*"],
                "@/*": ["*", "src/*"]
            }, undefined, true);
        }
    }
    prepareProject() {
        try {
            this.resolveTsConfigPaths();
        }
        catch (e) {
            utils_1.warn(e);
            this.tsConfigFilePath = undefined;
        }
        this.project = new ts_morph_1.Project({
            tsConfigFilePath: this.tsConfigFilePath,
            addFilesFromTsConfig: false,
            skipFileDependencyResolution: true
        });
        const components = this.config.final.components;
        const excludePatterns = [
            ...this.config.final.excludePatterns
        ];
        const includePatterns = [];
        components.forEach(component => {
            includePatterns.push(...component.patterns);
            if (component.excludePatterns) {
                excludePatterns.push(...component.excludePatterns);
            }
        });
        utils_1.info("Searching files...");
        utils_1.getPaths(this.config.directory, "", includePatterns, excludePatterns).forEach(path => {
            if (path.endsWith("**")) {
                this.folderPaths.push(path);
            }
            else {
                this.filePaths.push(path);
            }
        });
    }
    cleanProject() {
        this.tsResolve = undefined;
        this.tsConfigFilePath = undefined;
        this.folderPaths = [];
        this.filePaths = [];
    }
    parse() {
        this.prepareProject();
        const files = {};
        const progress = new ProgressBar("Parsing :bar", {
            clear: true,
            total: this.folderPaths.length + this.filePaths.length,
            width: process.stdout.columns
        });
        utils_1.info("Parsing", progress.total, "files");
        this.folderPaths.forEach(fullPath => {
            files[fullPath] = { exports: [], imports: {} };
            progress.tick();
        });
        this.filePaths.forEach(fullPath => {
            utils_1.trace(`Adding ${fullPath}`);
            const sourceFile = this.project.addExistingSourceFile(fullPath);
            const filePath = path.relative(this.config.directory, fullPath);
            const statements = sourceFile.getStatements();
            utils_1.debug(filePath, statements.length, "statements");
            const exports = this.getExports(sourceFile, statements);
            const imports = this.getImports(sourceFile, statements);
            utils_1.debug("-", Object.keys(exports).length, "exports", Object.keys(imports).length, "imports");
            files[fullPath] = { exports, imports };
            this.project.removeSourceFile(sourceFile);
            progress.tick();
        });
        this.cleanProject();
        progress.terminate();
        return files;
    }
    getImports(sourceFile, statements) {
        return statements.reduce((imports, statement) => {
            let sourceFileImports;
            if (ts_morph_1.TypeGuards.isVariableStatement(statement) ||
                ts_morph_1.TypeGuards.isExpressionStatement(statement)) {
                const text = statement.getText();
                const [match, moduleSpecifier, namedImport] = Array.from(REQUIRE_RE.exec(text) || []);
                if (moduleSpecifier) {
                    sourceFileImports = this.addModule(imports, moduleSpecifier, sourceFile);
                    if (sourceFileImports && namedImport) {
                        sourceFileImports.push(namedImport);
                    }
                }
            }
            else if (ts_morph_1.TypeGuards.isImportDeclaration(statement) ||
                ts_morph_1.TypeGuards.isExportDeclaration(statement)) {
                let moduleSpecifier;
                let structure;
                try {
                    structure = statement.getStructure();
                    moduleSpecifier = structure.moduleSpecifier;
                }
                catch (e) {
                    utils_1.warn(e);
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
                    ts_morph_1.TypeGuards.isImportDeclaration(statement)) {
                    const importStructure = structure;
                    if (importStructure.namespaceImport) {
                        sourceFileImports.push(importStructure.namespaceImport);
                    }
                    if (importStructure.defaultImport) {
                        sourceFileImports.push(importStructure.defaultImport);
                    }
                    if (importStructure.namedImports instanceof Array) {
                        sourceFileImports.push(...importStructure.namedImports.map(namedImport => typeof namedImport === "string"
                            ? namedImport
                            : namedImport.name));
                    }
                    if (!sourceFileImports.length && !importStructure.namedImports) {
                        utils_1.warn("IMPORT", sourceFile.getBaseName(), structure);
                    }
                }
            }
            return imports;
        }, {});
    }
    getExports(sourceFile, statements) {
        return statements.reduce((exports, statement) => {
            if (ts_morph_1.TypeGuards.isExportableNode(statement) &&
                statement.hasExportKeyword()) {
                if (ts_morph_1.TypeGuards.isVariableStatement(statement)) {
                    try {
                        const structure = statement.getStructure();
                        exports.push(...structure.declarations.map(declaration => declaration.name));
                    }
                    catch (e) {
                        utils_1.warn(e);
                        utils_1.warn(statement.getText());
                    }
                }
                else if (ts_morph_1.TypeGuards.isInterfaceDeclaration(statement) ||
                    ts_morph_1.TypeGuards.isClassDeclaration(statement) ||
                    ts_morph_1.TypeGuards.isEnumDeclaration(statement) ||
                    ts_morph_1.TypeGuards.isTypeAliasDeclaration(statement)) {
                    try {
                        const structure = statement.getStructure();
                        if (structure.name) {
                            exports.push(structure.name);
                        }
                    }
                    catch (e) {
                        utils_1.warn(e);
                        utils_1.warn(statement.getText());
                    }
                }
                else if (ts_morph_1.TypeGuards.isFunctionDeclaration(statement)) {
                    try {
                        const structure = statement.getStructure();
                        utils_1.trace("EXPORT", sourceFile.getBaseName(), structure);
                    }
                    catch (e) {
                        utils_1.warn(e);
                        utils_1.warn(statement.getText());
                    }
                }
                else {
                    utils_1.warn("EXPORT Unknown type", sourceFile.getBaseName(), statement);
                }
            }
            return exports;
        }, []);
    }
    addModule(imports, moduleSpecifier, sourceFile) {
        const modulePath = this.getModulePath(moduleSpecifier, sourceFile);
        if (modulePath) {
            const folder = utils_1.find(modulePath, this.folderPaths);
            const realModulePath = folder || modulePath;
            if (!imports[realModulePath]) {
                imports[realModulePath] = [];
            }
            return imports[realModulePath];
        }
        else {
            utils_1.trace("Import not found", sourceFile.getBaseName(), moduleSpecifier);
        }
    }
    getModulePath(moduleSpecifier, sourceFile) {
        try {
            utils_1.trace(moduleSpecifier, sourceFile.getDirectoryPath(), this.config.extensions);
            return resolve_1.sync(moduleSpecifier, {
                basedir: sourceFile.getDirectoryPath(),
                extensions: this.config.extensions
            });
        }
        catch (e) {
            return this.resolveTsModule(moduleSpecifier);
        }
    }
    resolveTsModule(moduleSpecifier) {
        if (!this.tsResolve)
            return;
        const modulePath = this.tsResolve(moduleSpecifier, undefined, undefined, this.config.extensions);
        utils_1.debug("Resolve TS", moduleSpecifier, modulePath);
        if (!modulePath)
            return;
        for (const ext of this.config.extensions) {
            const fullPath = `${modulePath}${ext}`;
            if (this.filePaths.includes(fullPath)) {
                return fullPath;
            }
        }
    }
}
exports.Parser = Parser;
