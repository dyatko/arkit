"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
const config_1 = require("./config");
const parser_1 = require("./parser");
const generator_1 = require("./generator");
const types_1 = require("./types");
const cli_1 = require("./cli");
const ProgressBar = require("progress");
const puml_1 = require("./puml");
const converter_1 = require("./converter");
const getOptions = (options) => {
    const opts = Object.assign(Object.assign({}, cli_1.cli.argv), options);
    opts.directory = utils_1.getAbsolute(opts.directory);
    if (opts.first) {
        opts.first = utils_1.convertToRelative(opts.first, opts.directory);
    }
    if (opts.output) {
        opts.output = utils_1.convertToRelative(opts.output, opts.directory, Object.values(types_1.OutputFormat));
    }
    if (opts.exclude) {
        opts.exclude = utils_1.convertToRelative(opts.exclude, opts.directory);
    }
    return opts;
};
exports.getConfig = (options) => {
    const opts = getOptions(options);
    utils_1.info("Options");
    utils_1.info(opts);
    return new config_1.Config(opts);
};
exports.getOutputs = (config) => {
    const files = new parser_1.Parser(config).parse();
    utils_1.trace("Parsed files");
    utils_1.trace(files);
    const outputs = config.final.output;
    const generator = new generator_1.Generator(config, files);
    const converter = new converter_1.Converter(config);
    const total = outputs.reduce((total, output) => total + utils_1.array(output.path).length, outputs.length * 2);
    const progress = new ProgressBar("Generating :bar", {
        total,
        clear: true,
        width: process.stdout.columns
    });
    return Promise.all(outputs.reduce((promises, output) => {
        const layers = generator.generate(output);
        progress.tick();
        const puml = new puml_1.PUML().from(output, layers);
        progress.tick();
        const paths = utils_1.array(output.path);
        for (const path of paths) {
            const promise = converter.convert(path, puml).then(value => {
                progress.tick();
                return value;
            });
            promises.push(promise);
        }
        return promises;
    }, []));
};
exports.arkit = (options) => {
    const config = exports.getConfig(options);
    utils_1.info("Config");
    utils_1.info(config);
    return exports.getOutputs(config);
};
