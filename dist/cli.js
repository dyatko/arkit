"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cli = void 0;
const yargs_1 = __importDefault(require("yargs"));
const helpers_1 = require("yargs/helpers");
const parseDirectory = (directory) => {
    if (directory instanceof Array)
        directory = directory[0];
    return directory || ".";
};
const splitByComma = (value = "") => {
    return value.split(",");
};
exports.cli = (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
    .scriptName("arkit")
    .usage("$0 [directory]")
    .option("directory", {
    description: "Working directory",
    default: ".",
    coerce: parseDirectory,
})
    .option("first", {
    description: "File patterns to be first in the graph",
    string: true,
})
    .option("exclude", {
    description: "File patterns to exclude from the graph",
    default: "test,tests,dist,coverage,**/*.test.*,**/*.spec.*,**/*.min.*",
})
    .option("output", {
    description: "Output path or type (svg, png or puml)",
    default: "arkit.svg",
})
    .option("config", {
    description: "Config file path (json or js)",
    default: "arkit.json",
})
    .alias({
    d: "directory",
    c: "config",
    o: "output",
    f: "first",
    e: "exclude",
    h: "help",
    v: "version",
    _: "directory",
})
    .coerce({
    exclude: splitByComma,
    first: splitByComma,
    output: splitByComma,
});
