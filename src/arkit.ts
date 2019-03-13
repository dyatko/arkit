import * as path from 'path'
import * as yargs from 'yargs'
import { info, trace } from './utils'
import { Config } from './config'
import { Parser } from './parser'
import { Generator } from './generator'
import { Options, OutputFormat, SavedString } from './types'

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
    description: 'File patterns to start with',
    string: true
  })
  .option('exclude', {
    description: 'File patterns to exclude',
    default: 'test,tests,dist,coverage,**/*.test.*,**/*.spec.*,**/*.min.*'
  })
  .option('output', {
    description: 'Output type or file path to save'
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
  .coerce({
    exclude: splitByComma,
    first: splitByComma,
    output: splitByComma
  })

const getAbsolute = (filepath: string): string => {
  return !path.isAbsolute(filepath) ? path.resolve(process.cwd(), filepath) : filepath
}

const convertToRelative = (paths: string[], root: string, excludes: string[] = []): string[] => {
  return paths.map(filepath => {
    if (excludes.includes(filepath)) {
      return filepath
    }
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
    opts.output = convertToRelative(opts.output, opts.directory, Object.values(OutputFormat))
  }

  if (opts.exclude) {
    opts.exclude = convertToRelative(opts.exclude, opts.directory)
  }

  return opts
}

export const getConfig = (options?: Options): Config => {
  const opts = getOptions(options)
  info('Options')
  info(opts)

  return new Config(opts)
}

export const getOutputs = (config: Config): Promise<SavedString[]> => {
  const files = new Parser(config).parse()
  trace('Parsed files')
  trace(files)

  return new Generator(config, files).generate()
}

export const arkit = (options?: Options): Promise<SavedString[]> => {
  const config = getConfig(options)
  info('Config')
  info(config)

  return getOutputs(config)
}
