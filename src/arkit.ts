import * as path from 'path'
import * as yargs from 'yargs'
import { debug, trace } from './logger'
import { Config } from './config'
import { Parser } from './parser'
import { Generator } from './generator'

export interface Options {
  directory: string,
  output?: string[],
  first?: string[],
  exclude?: string[]
}

const parseDirectory = (directory: string | string[]): string => {
  if (directory instanceof Array) directory = directory[0]
  return directory || '.'
}

const splitByComma = (value = ''): string[] => {
  return value.split(',')
}

const cli = yargs
  .usage('$0 [directory]')
  .option('directory', {
    description: 'Working directory',
    default: '.',
    coerce: parseDirectory
  })
  .option('first', {
    description: 'First component file patterns, e.g. src/index.js',
    coerce: splitByComma
  })
  .option('exclude', {
    description: 'File patterns to exclude, e.g. "node_modules"',
    coerce: splitByComma
  })
  .option('output', {
    description: 'Output file paths or type, e.g. arkit.svg or puml',
    coerce: splitByComma
  })
  .alias({
    o: 'output',
    f: 'first',
    e: 'exclude',
    d: 'directory',
    h: 'help',
    v: 'version',
    _: 'directory'
  })

export const arkit = (options?: Options): Promise<string[]> => {
  const opts: Options = {
    ...cli.argv,
    ...options
  }

  if (!path.isAbsolute(opts.directory)) {
    opts.directory = path.join(process.cwd(), opts.directory)
  }

  if (!opts.exclude || !opts.exclude.length) {
    opts.exclude = [
      'node_modules', 'test', 'tests',
      '**/*.test.*', '**/*.spec.*'
    ]
  }

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
  return generator.generate()
}
