#! /usr/bin/env node

const { arkit } = require('./dist/arkit')

if (require.main === module) {
  const cli = require('yargs')
  const description = require('./package').description
  const version = require('./package').version
  const homepage = require('./package').homepage

  cli
    .scriptName('arkit')
    .epilogue(`${description} ${homepage}`)
    .version(version)
    .help('help')

  arkit().then(outputs => {
    outputs.forEach(output => console.log(output))
  })
} else {
  module.exports = arkit
}
