"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const utils_1 = require("./utils");
const DEFAULT_COMPONENTS = [
    {
        type: 'Dependency',
        patterns: ['node_modules/*']
    },
    {
        type: 'Component',
        patterns: ['**/*.ts', '**/*.js', '**/*.jsx', '**/*.tsx']
    }
];
class Config {
    constructor(options) {
        this.extensions = ['.js', '.ts', '.jsx', '.tsx'];
        this.directory = options.directory;
        this.final = this.getFinalConfig(options);
    }
    getUserConfig() {
        const userConfigPath = path.resolve(this.directory, 'arkit');
        const userConfig = utils_1.safeRequire(userConfigPath);
        const packageJSONPath = path.resolve(this.directory, 'package');
        const packageJSON = utils_1.safeRequire(packageJSONPath);
        if (userConfig) {
            utils_1.debug(`Found arkit config in ${userConfigPath}`);
            return userConfig;
        }
        if (packageJSON && packageJSON.arkit) {
            utils_1.debug(`Found arkit config in ${packageJSONPath}`);
            return packageJSON.arkit;
        }
    }
    getFinalConfig(options) {
        const userConfig = this.getUserConfig();
        return {
            components: this.getFinalComponents(options, userConfig),
            excludePatterns: this.getExcludedPatterns(options, userConfig),
            output: this.getFinalOutputs(options, userConfig)
        };
    }
    getFinalComponents(options, userConfig) {
        const userComponents = userConfig && userConfig.components;
        return userComponents ? utils_1.array(userComponents) : DEFAULT_COMPONENTS;
    }
    getFinalOutputs(options, userConfig) {
        const initialOutputs = utils_1.array(userConfig && userConfig.output) || [{}];
        const outputOption = options.output && options.output.length ? options.output : undefined;
        const firstOption = options.first && options.first.length ? options.first : undefined;
        const userComponents = userConfig && userConfig.components;
        const generatedGroups = [
            { first: true, components: ['Component'] },
            { type: 'Dependencies', components: ['Dependency'] }
        ];
        if (firstOption) {
            generatedGroups[0].components = undefined;
            generatedGroups[0].patterns = firstOption;
            generatedGroups.push({}); // everything else
        }
        return initialOutputs.map(output => (Object.assign({}, output, { path: utils_1.array(outputOption || output.path || 'svg'), groups: output.groups || (!userComponents ? generatedGroups : undefined) })));
    }
    getExcludedPatterns(options, userConfig) {
        const excludePatterns = [];
        if (options.exclude) {
            excludePatterns.push(...options.exclude);
        }
        if (userConfig && userConfig.excludePatterns) {
            excludePatterns.push(...userConfig.excludePatterns);
        }
        return excludePatterns;
    }
}
exports.Config = Config;
