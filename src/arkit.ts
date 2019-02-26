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
    directory: (options && options.directory) || '',
    output: (options && options.output) || [],
    first: (options && options.first) || []
  }
  const directory = path.isAbsolute(opts.directory) ? opts.directory : path.join(process.cwd(), opts.directory)

  return {
    ...opts,
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

  return Promise.all(config.outputs.reduce((promises, output) => {
    const puml = generator.generatePlantUML(output)

    if (output.path && output.path.length) {
      for (const outputPath of config.array(output.path)!) {
        promises.push(generator.convert(outputPath, puml))
      }
    } else {
      promises.push(generator.convert('svg', puml))
    }

    return promises
  }, [] as Promise<string>[]))
}
