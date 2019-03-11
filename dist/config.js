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
        this.patterns = [];
        this.extensions = ['.js', '.ts', '.jsx', '.tsx'];
        this.directory = options.directory;
        const userConfig = this.getUserConfig();
        const userComponents = userConfig && userConfig.components;
        this.components = userComponents ? utils_1.array(userComponents) : DEFAULT_COMPONENTS;
        this.outputs = this.getOutputs(options, userConfig);
        this.excludePatterns = this.getExcludePatterns(options, userConfig);
        for (const component of this.components) {
            if (component.patterns) {
                this.patterns.push(...component.patterns);
            }
        }
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
    getOutputs(options, userConfig) {
        const userConfigOutput = utils_1.array(userConfig && userConfig.output) || [{}];
        const outputOption = options.output && options.output.length ? options.output : undefined;
        const firstOption = options.first && options.first.length ? options.first : undefined;
        const hasDefaultComponents = this.components === DEFAULT_COMPONENTS ? true : undefined;
        const generatedGroups = hasDefaultComponents && [
            { first: true, components: firstOption ? undefined : ['Component'], patterns: firstOption },
            { type: 'Dependencies', components: ['Dependency'] },
            {} // everything else
        ];
        return userConfigOutput.map(output => (Object.assign({}, output, { path: output.path || outputOption, groups: output.groups || generatedGroups })));
    }
    getExcludePatterns(options, userConfig) {
        const excludePatterns = [];
        if (options.exclude) {
            excludePatterns.push(...options.exclude);
        }
        if (userConfig && userConfig.excludePatterns) {
            excludePatterns.push(...userConfig.excludePatterns);
        }
        for (const component of this.components) {
            if (component.excludePatterns) {
                excludePatterns.push(...component.excludePatterns);
            }
        }
        return excludePatterns;
    }
}
exports.Config = Config;
