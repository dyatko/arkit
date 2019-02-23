import * as fs from 'fs'
import * as path from 'path'
import { debug, trace } from './logger'
import { Config } from './config'
import { Parser } from './parser'
import { Generator } from './generator'

export const arkit = (directory: string): string[] => {
  const config = new Config(directory)

  debug(`Config`)
  trace(config)

  const parser = new Parser(config)
  const files = parser.parse()

  trace('Parsed files')
  trace(files)

  const generator = new Generator(config, files)

  return config.outputs.map(output => {
    const puml = generator.generatePlantUML(output)

    if (output.path) {
      for (const outputPath of config.array(output.path)!) {
        const fullExportPath = path.join(config.directory, outputPath)
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

    return puml
  })
}
