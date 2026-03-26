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

  console.error(
    `Running against ${config.directory} with the following config:`,
  );
  console.error(JSON.stringify(config.final, undefined, 2));

  console.error(
    "\nNote: Arkit now uses LOCAL PlantUML conversion (requires Java JRE 8+).",
  );
  console.error(
    "Your code stays private and never leaves your machine. No external service calls.\n",
  );

  const isJson = cli.argv.json;

  getOutputs(config)
    .then((outputs) => {
      if (isJson) {
        const result = {
          success: true,
          version,
          directory: config.directory,
          outputs: outputs.map((output) => ({
            path: output.path || null,
            format: output.path
              ? output.path.split(".").pop()
              : null,
            size: output.toString().length,
          })),
        };
        console.log(JSON.stringify(result, null, 2));
      } else {
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
      }
    })
    .catch((err) => {
      if (isJson) {
        console.log(
          JSON.stringify({ success: false, error: err.message }, null, 2),
        );
        process.exit(1);
      } else {
        console.error(err.message || err);
        process.exit(1);
      }
    });
} else {
  module.exports = arkit;
}
