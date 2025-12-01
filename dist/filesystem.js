"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileSystem = void 0;
const tsconfig_paths_1 = require("tsconfig-paths");
const logger_1 = require("./logger");
const ts_morph_1 = require("ts-morph");
const utils_1 = require("./utils");
const resolve_1 = require("resolve");
class FileSystem {
    constructor(config) {
        this.filePaths = [];
        this.folderPaths = [];
        this.config = config;
        this.prepareProject();
        this.preparePaths();
    }
    resolveTsConfigPaths() {
        const tsConfig = (0, tsconfig_paths_1.loadConfig)(this.config.directory);
        if (tsConfig.resultType === "success") {
            this.tsConfigFilePath = tsConfig.configFileAbsolutePath;
            (0, logger_1.debug)("Found TypeScript config", this.tsConfigFilePath);
            (0, logger_1.debug)("Registering ts-config paths...");
            (0, logger_1.debug)(tsConfig.paths);
            this.tsResolve = (0, tsconfig_paths_1.createMatchPath)(tsConfig.absoluteBaseUrl, tsConfig.paths, tsConfig.mainFields, tsConfig.addMatchAll);
        }
        else {
            this.tsResolve = (0, tsconfig_paths_1.createMatchPath)(this.config.directory, {
                "~/*": ["*"],
                "@/*": ["*", "src/*"],
            }, undefined, true);
        }
    }
    prepareProject() {
        try {
            this.resolveTsConfigPaths();
        }
        catch (e) {
            (0, logger_1.warn)(e);
            this.tsConfigFilePath = undefined;
        }
        this.project = new ts_morph_1.Project({
            tsConfigFilePath: this.tsConfigFilePath,
            skipFileDependencyResolution: true,
        });
    }
    preparePaths() {
        const components = this.config.final.components;
        const excludePatterns = [
            ...this.config.final.excludePatterns,
        ];
        const includePatterns = [];
        components.forEach((component) => {
            includePatterns.push(...component.patterns);
            if (component.excludePatterns) {
                excludePatterns.push(...component.excludePatterns);
            }
        });
        (0, logger_1.info)("Searching files...");
        (0, utils_1.getPaths)(this.config.directory, "", includePatterns, excludePatterns).forEach((path) => {
            if (path.endsWith("**")) {
                this.folderPaths.push(path);
            }
            else {
                this.filePaths.push(path);
            }
        });
    }
    getModulePath(moduleSpecifier, sourceFile) {
        try {
            (0, logger_1.trace)(moduleSpecifier, sourceFile.getDirectoryPath(), this.config.extensions);
            return (0, resolve_1.sync)(moduleSpecifier, {
                basedir: sourceFile.getDirectoryPath(),
                extensions: this.config.extensions,
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
        (0, logger_1.debug)("Resolve TS", moduleSpecifier, modulePath);
        if (!modulePath)
            return;
        return (0, resolve_1.sync)(modulePath, {
            extensions: this.config.extensions,
        });
    }
}
exports.FileSystem = FileSystem;
