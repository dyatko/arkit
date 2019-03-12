#! /usr/bin/env node

const { arkit, getConfig, getOutputs } = require('./dist/arkit')

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

  const config = getConfig()

  console.log(`Running against ${config.directory} with the following config:`)
  console.log(JSON.stringify(config.final, undefined, 2))

  getOutputs(config).then(outputs => {
    outputs.forEach(output => console.log(output))
  })
} else {
  module.exports = arkit
}
