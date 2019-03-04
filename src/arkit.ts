import * as path from 'path'
import * as yargs from 'yargs'
import { debug, info } from './logger'
import { Config } from './config'
import { Parser } from './parser'
import { Generator } from './generator'
import { Options } from './schema'

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

const getAbsolute = (filepath: string): string => {
  return !path.isAbsolute(filepath) ? path.resolve(process.cwd(), filepath) : filepath
}

const convertToRelative = (paths: string[], root: string): string[] => {
  return paths.map(filepath => {
    return path.relative(root, getAbsolute(filepath))
  })
}

const getOptions = (options?: Options): Options => {
  const opts: Options = {
    ...cli.argv,
    ...options
  }

  opts.directory = getAbsolute(opts.directory)

  if (opts.first) {
    opts.first = convertToRelative(opts.first, opts.directory)
  }

  if (opts.output) {
    opts.output = convertToRelative(opts.output, opts.directory)
  }

  if (opts.exclude) {
    opts.exclude = convertToRelative(opts.exclude, opts.directory)
  } else {
    opts.exclude = [
      'node_modules', 'test', 'tests',
      '**/*.test.*', '**/*.spec.*'
    ]
  }

  return opts
}

export const arkit = (options?: Options): Promise<string[]> => {
  const opts = getOptions(options)
  info('Options')
  info(opts)

  const config = new Config(opts)

  info('Config')
  info(config)

  const parser = new Parser(config)
  const files = parser.parse()

  debug('Parsed files')
  debug(files)

  const generator = new Generator(config, files)
  return generator.generate()
}
