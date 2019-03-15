"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yargs = require("yargs");
const parseDirectory = (directory) => {
    if (directory instanceof Array)
        directory = directory[0];
    return directory || ".";
};
const splitByComma = (value = "") => {
    return value.split(",");
};
exports.cli = yargs
    .usage("$0 [directory]")
    .option("directory", {
    description: "Working directory",
    default: ".",
    coerce: parseDirectory
})
    .option("first", {
    description: "File patterns to start with",
    string: true
})
    .option("exclude", {
    description: "File patterns to exclude",
    default: "test,tests,dist,coverage,**/*.test.*,**/*.spec.*,**/*.min.*"
})
    .option("output", {
    description: "Output type or file path to save"
})
    .alias({
    o: "output",
    f: "first",
    e: "exclude",
    d: "directory",
    h: "help",
    v: "version",
    _: "directory"
})
    .coerce({
    exclude: splitByComma,
    first: splitByComma,
    output: splitByComma
});
