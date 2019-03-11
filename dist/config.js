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
        const userConfigPath = path.resolve(this.directory, 'arkit');
        const userConfig = utils_1.safeRequire(userConfigPath);
        this.components = utils_1.array(userConfig && userConfig.components) || [];
        if (!this.components.length) {
            this.components.push(...DEFAULT_COMPONENTS);
        }
        this.outputs = this.getOutputs(options, userConfig);
        this.excludePatterns = this.getExcludePatterns(options, userConfig);
        for (const component of this.components) {
            if (component.patterns) {
                this.patterns.push(...component.patterns);
            }
        }
    }
    getOutputs(options, userConfig) {
        const userConfigOutput = userConfig && userConfig.output;
        const outputOption = options.output && options.output.length ? options.output : undefined;
        const firstOption = options.first && options.first.length ? options.first : undefined;
        const shouldGenerateOutput = outputOption || firstOption || !userConfigOutput;
        if (!shouldGenerateOutput) {
            return utils_1.array(userConfigOutput);
        }
        return [
            {
                path: outputOption,
                groups: [
                    { first: true, components: firstOption ? undefined : ['Component'], patterns: firstOption },
                    { type: 'Dependencies', components: ['Dependency'] },
                    {} // everything else
                ]
            }
        ];
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
