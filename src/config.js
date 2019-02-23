"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const logger_1 = require("./logger");
/**
 * Component name formats
 */
var ComponentNameFormat;
(function (ComponentNameFormat) {
    ComponentNameFormat["BASE_NAME"] = "base";
    ComponentNameFormat["FULL_NAME"] = "full";
    ComponentNameFormat["COMPLETE_PATH"] = "complete";
})(ComponentNameFormat = exports.ComponentNameFormat || (exports.ComponentNameFormat = {}));
var OutputDirection;
(function (OutputDirection) {
    OutputDirection["HORIZONTAL"] = "horizontal";
    OutputDirection["VERTICAL"] = "vertical";
})(OutputDirection = exports.OutputDirection || (exports.OutputDirection = {}));
const DEFAULT_COMPONENTS = {
    type: 'Component',
    patterns: ['**/*.ts', '**/*.js', '**/*.jsx', '**/*.tsx']
};
exports.DEFAULT_CONFIG = {
    components: DEFAULT_COMPONENTS,
    excludePatterns: ['node_modules/**', 'test/**', '**/*.test.*', '**/*.spec.*'],
    output: {}
};
class Config {
    constructor(directory) {
        this.directory = directory;
        this.patterns = [];
        this.excludePatterns = [];
        this.extensions = ['.js', '.ts', '.jsx', '.tsx'];
        logger_1.info('Working directory', directory);
        const userConfigPath = path.join(this.directory, 'arkit');
        const userConfig = this.safeRequire(userConfigPath);
        this.components = this.array(userConfig && userConfig.components) || [];
        if (!this.components.length) {
            this.components.push(DEFAULT_COMPONENTS);
        }
        this.outputs = this.array(userConfig && userConfig.output || exports.DEFAULT_CONFIG.output);
        if (userConfig && userConfig.excludePatterns) {
            this.excludePatterns.push(...userConfig.excludePatterns);
        }
        else if (!userConfig && exports.DEFAULT_CONFIG.excludePatterns) {
            this.excludePatterns.push(...exports.DEFAULT_CONFIG.excludePatterns);
        }
        for (const component of this.components) {
            if (component.patterns) {
                this.patterns.push(...component.patterns);
            }
            if (component.excludePatterns) {
                this.excludePatterns.push(...component.excludePatterns);
            }
        }
    }
    safeRequire(path) {
        try {
            return require(path);
        }
        catch (e) {
            logger_1.warn(e.toString());
        }
    }
    array(input) {
        if (input) {
            return [].concat(input);
        }
    }
}
exports.Config = Config;
