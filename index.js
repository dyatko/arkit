#! /usr/bin/env node

const { arkit, getConfig, getOutputs } = require("./dist/arkit");

if (require.main === module) {
  const cli = require("yargs");
  const name = require("./package").name;
  const description = require("./package").description;
  const version = require("./package").version;
  const homepage = require("./package").homepage;

  cli
    .scriptName(name)
    .epilogue(`${description} ${homepage}`)
    .version(version)
    .help("help");

  const config = getConfig();

  console.log(`Running against ${config.directory} with the following config:`);
  console.log(JSON.stringify(config.final, undefined, 2));

  console.log("\nDisclaimer : Arkit is using a web service to convert PlantUML to SVG/PNG.");
  console.log("It's hosted at arkit.pro and does not store any data.");
  console.log("If you want to use Arkit at work make sure this is fine with your company tools policy.\n");

  getOutputs(config).then(outputs => {
    outputs
      .sort((a, b) => {
        if ((a.path && b.path) || (!a.path && !b.path)) return 0;
        return a.path ? 1 : -1;
      })
      .forEach(output => {
        if (output.path) {
          console.log(`Saved ${output.path}`);
        } else {
          console.log(output);
        }
      });
  });
} else {
  module.exports = arkit;
}
