"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts_morph_1 = require("ts-morph");
const path = require("path");
const minimatch = require("minimatch");
const resolve_1 = require("resolve");
const logger_1 = require("./logger");
const tsconfig_paths_1 = require("tsconfig-paths");
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
        logger_1.debug('Adding directory...');
        this.project.addExistingDirectory(this.config.directory, {
            recursive: true
        });
        logger_1.debug('Searching files...');
        const filePaths = this.project.getFileSystem()
            .glob(this.config.patterns)
            .filter(filepath => !this.config.excludePatterns.some(glob => minimatch(path.relative(this.config.directory, filepath), glob)));
        logger_1.trace(filePaths);
        logger_1.debug(`Adding ${filePaths.length} files...`);
        this.project.addExistingSourceFiles(filePaths).forEach(sourceFile => {
            this.sourceFiles.set(sourceFile.getFilePath(), sourceFile);
        });
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
    parse() {
        logger_1.debug('Parsing...');
        const files = {};
        for (const [fullPath, sourceFile] of this.sourceFiles) {
            const filePath = path.relative(this.config.directory, fullPath);
            files[filePath] = {
                exports: this.getExports(sourceFile),
                imports: this.getImports(sourceFile)
            };
        }
        return files;
    }
    getImports(sourceFile) {
        return sourceFile.getStatements().reduce((imports, statement) => {
            let sourceFileImports;
            if (ts_morph_1.TypeGuards.isImportDeclaration(statement) || ts_morph_1.TypeGuards.isExportDeclaration(statement)) {
                const structure = statement.getStructure();
                const moduleSpecifier = structure.moduleSpecifier;
                if (moduleSpecifier) {
                    const importedFile = statement.getModuleSpecifierSourceFile() ||
                        this.resolveModule(moduleSpecifier, sourceFile);
                    if (importedFile) {
                        const filePath = path.relative(this.config.directory, importedFile.getFilePath());
                        sourceFileImports = imports[filePath] = imports[filePath] || [];
                    }
                    else {
                        logger_1.warn('Import not found', sourceFile.getBaseName(), moduleSpecifier);
                    }
                }
            }
            if (ts_morph_1.TypeGuards.isImportDeclaration(statement) && sourceFileImports) {
                const structure = statement.getStructure();
                if (structure.namespaceImport) {
                    sourceFileImports.push(structure.namespaceImport);
                }
                if (structure.defaultImport) {
                    sourceFileImports.push(structure.defaultImport);
                }
                if (structure.namedImports instanceof Array) {
                    sourceFileImports.push(...structure.namedImports.map(namedImport => typeof namedImport === 'string' ? namedImport : namedImport.name));
                }
                if (!sourceFileImports.length && !structure.namedImports) {
                    logger_1.warn('IMPORT', sourceFile.getBaseName(), structure);
                }
            }
            return imports;
        }, {});
    }
    getExports(sourceFile) {
        return sourceFile.getStatements().reduce((exports, statement) => {
            if (ts_morph_1.TypeGuards.isExportableNode(statement) && statement.isExported()) {
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
                    throw new Error();
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
    }
    resolveTsModule(moduleSpecifier) {
        if (!this.tsResolve)
            return;
        logger_1.warn('Resolve TS', moduleSpecifier);
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
