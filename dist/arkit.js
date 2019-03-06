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
    description: 'File patterns to start with',
    string: true
})
    .option('exclude', {
    description: 'File patterns to exclude',
    default: 'node_modules,test,tests,**/*.test.*,**/*.spec.*'
})
    .option('output', {
    description: 'Output type or file path to save'
})
    .alias({
    o: 'output',
    f: 'first',
    e: 'exclude',
    d: 'directory',
    h: 'help',
    v: 'version',
    _: 'directory'
})
    .coerce({
    exclude: splitByComma,
    first: splitByComma,
    output: splitByComma
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
    logger_1.trace('Parsed files');
    logger_1.trace(files);
    const generator = new generator_1.Generator(config, files);
    return generator.generate();
};
