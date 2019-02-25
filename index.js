#! /usr/bin/env node

const arkit = require('./src/arkit').arkit

if (require.main === module) {
  const cli = require('commander')
  const description = require('./package').description
  const version = require('./package').version
  // const list = val => (val && val.split(',')) || []

  cli
    .description(description)
    .version(version)
    // .option('-f, --first [file ...]', 'First component file patterns', list)
    // .option('-o, --output [file ...]', 'Output file paths', list)
    .arguments('[dir]')
    .action((directory, options) => {
      void arkit({
        directory,
        first: options.first,
        output: options.output
      })
    })
    .parse(process.argv)
} else {
  module.exports = arkit
}
