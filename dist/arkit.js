"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const yargs = require("yargs");
const logger_1 = require("./logger");
const config_1 = require("./config");
const parser_1 = require("./parser");
const generator_1 = require("./generator");
const parseDirectory = (directory) => {
    if (directory instanceof Array)
        directory = directory[0];
    return directory || '.';
};
const splitByComma = (value = '') => {
    return value.split(',');
};
const cli = yargs
    .usage('$0 [directory]')
    .option('directory', {
    description: 'Working directory',
    default: '.',
    coerce: parseDirectory
})
    .option('first', {
    description: 'First component file patterns, e.g. src/index.js',
    coerce: splitByComma
})
    .option('exclude', {
    description: 'File patterns to exclude, e.g. "node_modules/**"',
    coerce: splitByComma
})
    .option('output', {
    description: 'Output file paths or type, e.g. arkit.svg or puml',
    coerce: splitByComma
})
    .alias({
    o: 'output',
    f: 'first',
    e: 'exclude',
    d: 'directory',
    h: 'help',
    v: 'version',
    _: 'directory'
});
exports.arkit = (options) => {
    const opts = Object.assign({}, cli.argv, options);
    if (!path.isAbsolute(opts.directory)) {
        opts.directory = path.join(process.cwd(), opts.directory);
    }
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
