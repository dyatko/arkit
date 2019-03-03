"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const nanomatch = require("nanomatch");
const os_1 = require("os");
const ts_morph_1 = require("ts-morph");
const resolve_1 = require("resolve");
const logger_1 = require("./logger");
const tsconfig_paths_1 = require("tsconfig-paths");
const readdir = require("recursive-readdir-synchronous");
const QUOTES = `(?:'|")`;
const TEXT_INSIDE_QUOTES = `${QUOTES}([^'"]+)${QUOTES}`;
const TEXT_INSIDE_QUOTES_RE = new RegExp(TEXT_INSIDE_QUOTES);
const REQUIRE_RE = new RegExp(`require\\(${TEXT_INSIDE_QUOTES}\\)(?:\\.(\\w+))?`);
class Parser {
    constructor(config) {
        this.config = config;
        this.sourceFiles = new Map();
        this.tsResolutionCache = new Map();
        this.resolveTsConfigPaths();
        this.project = new ts_morph_1.Project({
            tsConfigFilePath: this.tsConfigFilePath,
            addFilesFromTsConfig: false
        });
        logger_1.debug('Adding directory...', this.config.directory);
        this.project.addExistingDirectory(this.config.directory);
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
    addFiles() {
        logger_1.debug('Searching files...');
        const allFilePaths = readdir(this.config.directory, [
            (filepath) => {
                const relativePath = path.relative(this.config.directory, filepath);
                return !!this.config.excludePatterns.length &&
                    !!nanomatch(relativePath, this.config.excludePatterns).length;
            }
        ]);
        const suitableFilePaths = allFilePaths
            .map(filepath => path.relative(this.config.directory, filepath))
            .filter(filepath => nanomatch(filepath, this.config.patterns).length)
            .map(filepath => path.join(this.config.directory, filepath));
        logger_1.debug(suitableFilePaths);
        logger_1.info(`Adding ${suitableFilePaths.length} files`);
        this.project.addExistingSourceFiles(suitableFilePaths).forEach(sourceFile => {
            this.sourceFiles.set(sourceFile.getFilePath(), sourceFile);
        });
    }
    removeFiles() {
        logger_1.debug(`Removing ${this.sourceFiles.size} files`);
        this.sourceFiles.forEach(sourceFile => this.project.removeSourceFile(sourceFile));
        this.sourceFiles.clear();
    }
    parse() {
        this.addFiles();
        logger_1.info('Parsing', this.sourceFiles.size, 'files');
        const files = {};
        for (const [fullPath, sourceFile] of this.sourceFiles) {
            const filePath = path.relative(this.config.directory, fullPath);
            const statements = sourceFile.getStatements();
            logger_1.debug(filePath, statements.length, 'statements');
            const exports = this.getExports(sourceFile, statements);
            const imports = this.getImports(sourceFile, statements);
            logger_1.debug('-', Object.keys(exports).length, 'exports', Object.keys(imports).length, 'imports');
            files[filePath] = { exports, imports };
        }
        this.removeFiles();
        return files;
    }
    getImports(sourceFile, statements) {
        return statements.reduce((imports, statement) => {
            let sourceFileImports;
            let structure;
            if (ts_morph_1.TypeGuards.isVariableStatement(statement) || ts_morph_1.TypeGuards.isExpressionStatement(statement)) {
                const text = statement.getText();
                const [match, moduleSpecifier, namedImport] = Array.from(REQUIRE_RE.exec(text) || []);
                if (moduleSpecifier) {
                    const importedFile = this.resolveModule(moduleSpecifier, sourceFile);
                    sourceFileImports = this.addImportedFile(importedFile, imports);
                    if (sourceFileImports && namedImport) {
                        sourceFileImports.push(namedImport);
                    }
                }
            }
            if (ts_morph_1.TypeGuards.isImportDeclaration(statement) || ts_morph_1.TypeGuards.isExportDeclaration(statement)) {
                let moduleSpecifier;
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
                    const importedFile = (structure && statement.getModuleSpecifierSourceFile()) ||
                        this.resolveModule(moduleSpecifier, sourceFile);
                    sourceFileImports = this.addImportedFile(importedFile, imports);
                }
            }
            if (ts_morph_1.TypeGuards.isImportDeclaration(statement) && sourceFileImports && structure) {
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
            return imports;
        }, {});
    }
    addImportedFile(importedFile, imports) {
        if (importedFile) {
            const filePath = path.relative(this.config.directory, importedFile.getFilePath());
            if (!imports[filePath])
                imports[filePath] = [];
            return imports[filePath];
        }
    }
    getExports(sourceFile, statements) {
        return statements.reduce((exports, statement) => {
            if (ts_morph_1.TypeGuards.isExportableNode(statement) && statement.hasExportKeyword()) {
                if (ts_morph_1.TypeGuards.isVariableStatement(statement)) {
                    const structure = statement.getStructure();
                    exports = [
                        ...exports,
                        structure.declarations.map(declaration => declaration.name)
                    ];
                }
                else if (ts_morph_1.TypeGuards.isInterfaceDeclaration(statement) ||
                    ts_morph_1.TypeGuards.isClassDeclaration(statement) ||
                    ts_morph_1.TypeGuards.isEnumDeclaration(statement) ||
                    ts_morph_1.TypeGuards.isFunctionDeclaration(statement) ||
                    ts_morph_1.TypeGuards.isTypeAliasDeclaration(statement)) {
                    logger_1.trace('EXPORT', sourceFile.getBaseName(), statement.getStructure());
                }
                else {
                    logger_1.warn('EXPORT Unknown type', sourceFile.getBaseName(), statement);
                }
            }
            return exports;
        }, []);
    }
    resolveModule(moduleSpecifier, sourceFile) {
        let modulePath;
        if (!this.tsResolutionCache.has(moduleSpecifier)) {
            try {
                modulePath = resolve_1.sync(moduleSpecifier, {
                    basedir: sourceFile.getDirectoryPath(),
                    extensions: this.config.extensions
                });
            }
            catch (e) {
                modulePath = this.resolveTsModule(moduleSpecifier);
                this.tsResolutionCache.set(moduleSpecifier, modulePath);
            }
        }
        else {
            modulePath = this.tsResolutionCache.get(moduleSpecifier);
        }
        if (modulePath) {
            return this.sourceFiles.get(modulePath);
        }
        else {
            logger_1.trace('Import not found', sourceFile.getBaseName(), moduleSpecifier);
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
