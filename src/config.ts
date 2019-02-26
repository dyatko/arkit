import * as path from 'path'
import { trace } from './logger'
import { Options } from './arkit'
import { ComponentSchema, ConfigSchema, OutputSchema } from './schema'

const DEFAULT_COMPONENTS: ComponentSchema = {
  type: 'Component',
  patterns: ['**/*.ts', '**/*.js', '**/*.jsx', '**/*.tsx']
}

export const DEFAULT_CONFIG: ConfigSchema = {
  components: DEFAULT_COMPONENTS,
  excludePatterns: ['node_modules/**', 'test/**', 'tests/**', '**/*.test.*', '**/*.spec.*'],
  output: {}
}

export class Config {
  directory: string
  components: ComponentSchema[]
  outputs: OutputSchema[]
  patterns: string[] = []
  excludePatterns: string[] = []
  extensions = ['.js', '.ts', '.jsx', '.tsx']

  constructor (options: Options) {
    this.directory = options.directory
    const userConfigPath = path.join(this.directory, 'arkit')
    const userConfig = this.safeRequire<ConfigSchema>(userConfigPath)

    this.components = this.array(userConfig && userConfig.components) || []

    if (!this.components.length) {
      this.components.push(DEFAULT_COMPONENTS)
    }

    this.outputs = this.getOutputs(options, userConfig)

    if (userConfig && userConfig.excludePatterns) {
      this.excludePatterns.push(...userConfig.excludePatterns)
    } else if (!userConfig && DEFAULT_CONFIG.excludePatterns) {
      this.excludePatterns.push(...DEFAULT_CONFIG.excludePatterns)
    }

    for (const component of this.components) {
      if (component.patterns) {
        this.patterns.push(...component.patterns)
      }
      if (component.excludePatterns) {
        this.excludePatterns.push(...component.excludePatterns)
      }
    }
  }

  getOutputs (options: Options, userConfig?: ConfigSchema): OutputSchema[] {
    const generatedSchema: OutputSchema = {}

    if (options.output && options.output.length) {
      generatedSchema.path = options.output
    }

    if (options.first && options.first.length) {
      generatedSchema.groups = [{ first: true, patterns: options.first }]
    }

    if (Object.keys(generatedSchema).length || !userConfig || !userConfig.output) {
      return this.array(generatedSchema)!
    }

    return this.array(userConfig.output)!
  }

  safeRequire<T> (path: string): T | undefined {
    try {
      return require(path)
    } catch (e) {
      trace(e.toString())
    }
  }

  array<T> (input?: T | T[]): T[] | undefined {
    if (input) {
      return ([] as T[]).concat(input)
    }
  }
}
