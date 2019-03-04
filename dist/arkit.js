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
    description: 'File patterns to exclude, e.g. "node_modules"',
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
const getAbsolute = (filepath) => {
    return !path.isAbsolute(filepath) ? path.resolve(process.cwd(), filepath) : filepath;
};
const convertToRelative = (paths, root) => {
    return paths.map(filepath => {
        return path.relative(root, getAbsolute(filepath));
    });
};
const getOptions = (options) => {
    const opts = Object.assign({}, cli.argv, options);
    opts.directory = getAbsolute(opts.directory);
    if (opts.first) {
        opts.first = convertToRelative(opts.first, opts.directory);
    }
    if (opts.output) {
        opts.output = convertToRelative(opts.output, opts.directory);
    }
    if (opts.exclude) {
        opts.exclude = convertToRelative(opts.exclude, opts.directory);
    }
    else {
        opts.exclude = [
            'node_modules', 'test', 'tests',
            '**/*.test.*', '**/*.spec.*'
        ];
    }
    return opts;
};
exports.arkit = (options) => {
    const opts = getOptions(options);
    logger_1.info('Options');
    logger_1.info(opts);
    const config = new config_1.Config(opts);
    logger_1.info('Config');
    logger_1.info(config);
    const parser = new parser_1.Parser(config);
    const files = parser.parse();
    logger_1.debug('Parsed files');
    logger_1.debug(files);
    const generator = new generator_1.Generator(config, files);
    return generator.generate();
};
