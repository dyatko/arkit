"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const logger_1 = require("./logger");
const config_1 = require("./config");
const parser_1 = require("./parser");
const generator_1 = require("./generator");
const getOptions = (options) => {
    const opts = {
        directory: (options && options.directory) || '',
        output: (options && options.output) || [],
        first: (options && options.first) || []
    };
    const directory = path.isAbsolute(opts.directory) ? opts.directory : path.join(process.cwd(), opts.directory);
    return Object.assign({}, opts, { directory });
};
exports.arkit = (options) => {
    const opts = getOptions(options);
    logger_1.debug('Options');
    logger_1.debug(opts);
    const config = new config_1.Config(opts);
    logger_1.debug('Config');
    logger_1.debug(config);
    const parser = new parser_1.Parser(config);
    const files = parser.parse();
    logger_1.trace('Parsed files');
    logger_1.trace(files);
    const generator = new generator_1.Generator(config, files);
    return Promise.all(config.outputs.reduce((promises, output) => {
        const puml = generator.generatePlantUML(output);
        if (output.path && output.path.length) {
            for (const outputPath of config.array(output.path)) {
                promises.push(generator.convert(outputPath, puml));
            }
        }
        else {
            promises.push(generator.convert('svg', puml));
        }
        return promises;
    }, []));
};
