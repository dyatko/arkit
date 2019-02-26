#! /usr/bin/env node

const arkit = require('./src/arkit').arkit

if (require.main === module) {
  const cli = require('commander')
  const description = require('./package').description
  const version = require('./package').version
  const list = val => (val && val.split(',')) || []

  cli
    .description(description)
    .version(version)
    .option('-f, --first [file ...]', 'First component file patterns, e.g. src/index.js', list)
    .option('-o, --output [file ...]', 'Output file paths or type, e.g. arkit.svg or puml', list)
    .arguments('[dir]')
    .action((directory, options) => {
      arkit({
        directory,
        first: options.first,
        output: options.output
      }).then(outputs => {
        outputs.forEach(output => console.log(output))
      })
    })
    .parse(process.argv)
} else {
  module.exports = arkit
}
