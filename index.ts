#! /usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'
import { Config } from './src/config'
import { Parser } from './src/parser'
import { Generator } from './src/generator'
import { debug, trace } from './src/logger'

export const main = (directory: string) => {
  const config = new Config(directory)

  debug(`Config ${config.path}`)
  trace(config)

  const parser = new Parser(config)
  const files = parser.parse()

  trace('Parsed files')
  trace(files)

  const generator = new Generator(config, files)

  for (const output of config.outputs) {
    const puml = generator.generatePlantUML(output)

    if (config.path && output.path) {
      for (const outputPath of config.array(output.path)!) {
        const fullExportPath = path.join(path.dirname(config.path), outputPath)
        const ext = path.extname(fullExportPath)

        if (fs.existsSync(fullExportPath)) {
          fs.unlinkSync(fullExportPath)
        }

        if (ext === '.puml') {
          fs.writeFileSync(fullExportPath, puml)
        }

        if (ext === '.svg') {
          generator.convertToSVG(puml).then(svg => {
            fs.writeFileSync(fullExportPath, svg)
          }).catch(err => {
            throw err
          })
        }
      }
    } else {
      console.log(puml)
    }
  }
}

if (require.main === module) {
  main(process.cwd())
}
