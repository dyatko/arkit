#! /usr/bin/env node

var arkit = require('./src/arkit').arkit

if (require.main === module) {
  void arkit(process.cwd())
} else {
  module.exports = arkit
}
