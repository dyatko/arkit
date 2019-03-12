"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const yargs = require("yargs");
const utils_1 = require("./utils");
const config_1 = require("./config");
const parser_1 = require("./parser");
const generator_1 = require("./generator");
const types_1 = require("./types");
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
    default: 'test,tests,dist,coverage,**/*.test.*,**/*.spec.*,**/*.min.*'
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
const convertToRelative = (paths, root, excludes = []) => {
    return paths.map(filepath => {
        if (excludes.includes(filepath)) {
            return filepath;
        }
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
        opts.output = convertToRelative(opts.output, opts.directory, Object.values(types_1.OutputFormat));
    }
    if (opts.exclude) {
        opts.exclude = convertToRelative(opts.exclude, opts.directory);
    }
    return opts;
};
exports.getConfig = (options) => {
    const opts = getOptions(options);
    utils_1.info('Options');
    utils_1.info(opts);
    return new config_1.Config(opts);
};
exports.getOutputs = (config) => {
    const files = new parser_1.Parser(config).parse();
    utils_1.trace('Parsed files');
    utils_1.trace(files);
    return new generator_1.Generator(config, files).generate();
};
exports.arkit = (options) => {
    const config = exports.getConfig(options);
    utils_1.info('Config');
    utils_1.info(config);
    return exports.getOutputs(config);
};
