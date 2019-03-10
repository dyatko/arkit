"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const os_1 = require("os");
const ts_morph_1 = require("ts-morph");
const resolve_1 = require("resolve");
const logger_1 = require("./logger");
const tsconfig_paths_1 = require("tsconfig-paths");
const utils_1 = require("./utils");
const QUOTES = `(?:'|")`;
const TEXT_INSIDE_QUOTES = `${QUOTES}([^'"]+)${QUOTES}`;
const TEXT_INSIDE_QUOTES_RE = new RegExp(TEXT_INSIDE_QUOTES);
const REQUIRE_RE = new RegExp(`require\\(${TEXT_INSIDE_QUOTES}\\)(?:\\.(\\w+))?`);
class Parser {
    constructor(config) {
        this.sourceFiles = new Map();
        this.sourceFolders = [];
        this.config = config;
    }
    resolveTsConfigPaths() {
        const tsConfig = tsconfig_paths_1.loadConfig(this.config.directory);
        if (tsConfig.resultType === 'success') {
            this.tsConfigFilePath = path.relative(this.config.directory, tsConfig.configFileAbsolutePath);
            logger_1.debug('Found TypeScript config', this.tsConfigFilePath);
            logger_1.debug('Registering ts-config paths...');
            this.tsResolve = tsconfig_paths_1.createMatchPath(tsConfig.absoluteBaseUrl, tsConfig.paths, tsConfig.mainFields, tsConfig.addMatchAll);
            logger_1.debug(tsConfig.paths);
        }
    }
    prepareProject() {
        this.resolveTsConfigPaths();
        this.project = new ts_morph_1.Project({
            compilerOptions: {
                target: ts_morph_1.ts.ScriptTarget.Latest,
                noEmit: true,
                skipLibCheck: true,
                allowJs: true
            },
            tsConfigFilePath: this.tsConfigFilePath,
            addFilesFromTsConfig: false,
            skipFileDependencyResolution: true
        });
        logger_1.info('Searching files...');
        utils_1.getPaths(this.config.directory, '', this.config.patterns, this.config.excludePatterns).forEach(fullPath => {
            logger_1.trace(`Adding ${fullPath}`);
            if (fullPath.endsWith('**')) {
                this.sourceFolders.push(fullPath);
            }
            else {
                this.sourceFiles.set(fullPath, this.project.addExistingSourceFile(fullPath));
            }
        });
        this.project.resolveSourceFileDependencies();
    }
    cleanProject() {
        for (const [filepath, sourceFile] of this.sourceFiles.entries()) {
            this.sourceFiles.delete(filepath);
            this.project.removeSourceFile(sourceFile);
        }
        this.tsResolve = undefined;
        this.tsConfigFilePath = undefined;
        this.sourceFiles.clear();
        this.sourceFolders = [];
    }
    parse() {
        this.prepareProject();
        logger_1.info('Parsing', this.sourceFiles.size, 'files');
        const files = {};
        for (const fullPath of this.sourceFolders) {
            files[fullPath] = {
                exports: [],
                imports: {}
            };
        }
        for (const [fullPath, sourceFile] of this.sourceFiles.entries()) {
            const filePath = path.relative(this.config.directory, fullPath);
            const statements = sourceFile.getStatements();
            logger_1.debug(filePath, statements.length, 'statements');
            const exports = this.getExports(sourceFile, statements);
            const imports = this.getImports(sourceFile, statements);
            logger_1.debug('-', Object.keys(exports).length, 'exports', Object.keys(imports).length, 'imports');
            files[fullPath] = { exports, imports };
        }
        this.cleanProject();
        return files;
    }
    getImports(sourceFile, statements) {
        return statements.reduce((imports, statement) => {
            let sourceFileImports;
            if (ts_morph_1.TypeGuards.isVariableStatement(statement) || ts_morph_1.TypeGuards.isExpressionStatement(statement)) {
                const text = statement.getText();
                const [match, moduleSpecifier, namedImport] = Array.from(REQUIRE_RE.exec(text) || []);
                if (moduleSpecifier) {
                    sourceFileImports = this.addModule(imports, moduleSpecifier, sourceFile);
                    if (sourceFileImports && namedImport) {
                        sourceFileImports.push(namedImport);
                    }
                }
            }
            else if (ts_morph_1.TypeGuards.isImportDeclaration(statement) || ts_morph_1.TypeGuards.isExportDeclaration(statement)) {
                let moduleSpecifier;
                let structure;
                try {
                    structure = statement.getStructure();
                    moduleSpecifier = structure.moduleSpecifier;
                }
                catch (e) {
                    logger_1.warn(e);
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
                if (sourceFileImports && structure && ts_morph_1.TypeGuards.isImportDeclaration(statement)) {
                    const importStructure = structure;
                    if (importStructure.namespaceImport) {
                        sourceFileImports.push(importStructure.namespaceImport);
                    }
                    if (importStructure.defaultImport) {
                        sourceFileImports.push(importStructure.defaultImport);
                    }
                    if (importStructure.namedImports instanceof Array) {
                        sourceFileImports.push(...importStructure.namedImports.map(namedImport => typeof namedImport === 'string' ? namedImport : namedImport.name));
                    }
                    if (!sourceFileImports.length && !importStructure.namedImports) {
                        logger_1.warn('IMPORT', sourceFile.getBaseName(), structure);
                    }
                }
            }
            return imports;
        }, {});
    }
    getExports(sourceFile, statements) {
        return statements.reduce((exports, statement) => {
            if (ts_morph_1.TypeGuards.isExportableNode(statement) && statement.hasExportKeyword()) {
                if (ts_morph_1.TypeGuards.isVariableStatement(statement)) {
                    try {
                        const structure = statement.getStructure();
                        exports = [
                            ...exports,
                            structure.declarations.map(declaration => declaration.name)
                        ];
                    }
                    catch (e) {
                        logger_1.warn(e);
                        logger_1.warn(statement.getText());
                    }
                }
                else if (ts_morph_1.TypeGuards.isInterfaceDeclaration(statement) ||
                    ts_morph_1.TypeGuards.isClassDeclaration(statement) ||
                    ts_morph_1.TypeGuards.isEnumDeclaration(statement) ||
                    ts_morph_1.TypeGuards.isFunctionDeclaration(statement) ||
                    ts_morph_1.TypeGuards.isTypeAliasDeclaration(statement)) {
                    try {
                        logger_1.trace('EXPORT', sourceFile.getBaseName(), statement.getStructure());
                    }
                    catch (e) {
                        logger_1.warn(e);
                        logger_1.warn(statement.getText());
                    }
                }
                else {
                    logger_1.warn('EXPORT Unknown type', sourceFile.getBaseName(), statement);
                }
            }
            return exports;
        }, []);
    }
    addModule(imports, moduleSpecifier, sourceFile) {
        const modulePath = this.getModulePath(moduleSpecifier, sourceFile);
        if (modulePath) {
            const folder = utils_1.find(modulePath, this.sourceFolders);
            const realModulePath = folder || modulePath;
            if (!imports[realModulePath]) {
                imports[realModulePath] = [];
            }
            return imports[realModulePath];
        }
        else {
            logger_1.trace('Import not found', sourceFile.getBaseName(), moduleSpecifier);
        }
    }
    getModulePath(moduleSpecifier, sourceFile) {
        try {
            logger_1.trace(moduleSpecifier, sourceFile.getDirectoryPath(), this.config.extensions);
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
        logger_1.trace('Resolve TS', moduleSpecifier);
        const modulePath = this.tsResolve(moduleSpecifier);
        if (!modulePath)
            return;
        for (const ext of this.config.extensions) {
            const fullPath = `${modulePath}${ext}`;
            if (this.sourceFiles.has(fullPath)) {
                return fullPath;
            }
        }
    }
}
exports.Parser = Parser;
