import * as yargs from "yargs";

const parseDirectory = (directory: string | string[]): string => {
  if (directory instanceof Array) directory = directory[0];
  return directory || ".";
};

const splitByComma = (value = ""): string[] => {
  return value.split(",");
};

export const cli = yargs
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
