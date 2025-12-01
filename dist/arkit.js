"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arkit = exports.getOutputs = exports.getConfig = void 0;
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
    const argv = cli_1.cli.argv;
    const opts = Object.assign(Object.assign({ directory: ".", config: "arkit.json", output: ["arkit.svg"] }, argv), options);
    opts.directory = (0, utils_1.getAbsolute)(opts.directory);
    if (opts.first) {
        opts.first = (0, utils_1.convertToRelative)(opts.first, opts.directory);
    }
    if (opts.output) {
        opts.output = (0, utils_1.convertToRelative)(opts.output, opts.directory, Object.values(types_1.OutputFormat));
    }
    if (opts.exclude) {
        opts.exclude = (0, utils_1.convertToRelative)(opts.exclude, opts.directory);
    }
    return opts;
};
const getConfig = (options) => {
    const opts = getOptions(options);
    (0, utils_1.info)("Options");
    (0, utils_1.info)(opts);
    return new config_1.Config(opts);
};
exports.getConfig = getConfig;
const getOutputs = (config) => {
    const files = new parser_1.Parser(config).parse();
    (0, utils_1.trace)("Parsed files");
    (0, utils_1.trace)(files);
    const outputs = config.final.output;
    const generator = new generator_1.Generator(config, files);
    const converter = new converter_1.Converter(config);
    const total = outputs.reduce((total, output) => total + (0, utils_1.array)(output.path).length, outputs.length * 2);
    const progress = new ProgressBar("Generating :bar", {
        total,
        clear: true,
        width: process.stdout.columns,
    });
    return Promise.all(outputs.reduce((promises, output) => {
        const layers = generator.generate(output);
        progress.tick();
        const puml = new puml_1.PUML().from(output, layers);
        progress.tick();
        const paths = (0, utils_1.array)(output.path);
        for (const path of paths) {
            const promise = converter.convert(path, puml).then((value) => {
                progress.tick();
                return value;
            });
            promises.push(promise);
        }
        return promises;
    }, []));
};
exports.getOutputs = getOutputs;
const arkit = (options) => {
    const config = (0, exports.getConfig)(options);
    (0, utils_1.info)("Config");
    (0, utils_1.info)(config);
    return (0, exports.getOutputs)(config);
};
exports.arkit = arkit;
