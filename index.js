#!/usr/bin/env node

const { cli } = require("./dist/cli");
const { arkit, getConfig, getOutputs } = require("./dist/arkit");
const { version, description, homepage } = require("./package.json");

if (require.main === module) {
  cli
    .epilogue(`${description} ${homepage}`)
    .version(version)
    .help("help");

  const config = getConfig();

  console.log(
    `Running against ${config.directory} with the following config:`,
  );
  console.log(JSON.stringify(config.final, undefined, 2));

  console.log(
    "\nNote: Arkit now uses LOCAL PlantUML conversion (requires Java JRE 8+).",
  );
  console.log(
    "Your code stays private and never leaves your machine. No external service calls.\n",
  );

  getOutputs(config).then((outputs) => {
    outputs
      .sort((a, b) => {
        if ((a.path && b.path) || (!a.path && !b.path)) return 0;
        return a.path ? 1 : -1;
      })
      .forEach((output) => {
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
