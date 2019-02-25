import * as fs from 'fs'
import * as path from 'path'
import { debug, trace } from './logger'
import { Config } from './config'
import { Parser } from './parser'
import { Generator } from './generator'

export interface Options {
  directory: string,
  output?: string[],
  first?: string[]
}

const getOptions = (options?: Options): Options => {
  const opts: Options = {
    ...options,
    directory: (options && options.directory) || ''
  }
  const directory = path.isAbsolute(opts.directory) ? opts.directory : path.join(process.cwd(), opts.directory)

  return {
    directory
  }
}

export const arkit = (options?: Options): Promise<string[]> => {
  const opts = getOptions(options)
  debug('Options')
  debug(opts)

  const config = new Config(opts)

  debug('Config')
  debug(config)

  const parser = new Parser(config)
  const files = parser.parse()

  trace('Parsed files')
  trace(files)

  const generator = new Generator(config, files)

  return Promise.all(config.outputs.map(output => {
    const puml = generator.generatePlantUML(output)

    if (output.path) {
      for (const outputPath of config.array(output.path)!) {
        const fullExportPath = path.join(config.directory, outputPath)
        const ext = path.extname(fullExportPath)

        if (fs.existsSync(fullExportPath)) {
          debug('Removing', fullExportPath)
          fs.unlinkSync(fullExportPath)
        }

        debug('Saving', fullExportPath)

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

      return puml
    }

    return generator.convertToSVG(puml).then(svg => {
      console.log(svg)
      return puml
    }).catch(err => {
      throw err
    })
  }))
}
