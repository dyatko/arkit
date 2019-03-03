import * as path from 'path'
import { trace } from './logger'
import { ComponentSchema, ConfigSchema, Options, OutputSchema } from './schema'

const DEFAULT_COMPONENTS: ComponentSchema = {
  type: 'Component',
  patterns: ['**/*.ts', '**/*.js', '**/*.jsx', '**/*.tsx']
}

export class Config {
  directory: string
  components: ComponentSchema[]
  outputs: OutputSchema[]
  patterns: string[] = []
  excludePatterns: string[]
  extensions = ['.js', '.ts', '.jsx', '.tsx']

  constructor (options: Options) {
    this.directory = options.directory
    const userConfigPath = path.resolve(this.directory, 'arkit')
    const userConfig = this.safeRequire<ConfigSchema>(userConfigPath)

    this.components = this.array(userConfig && userConfig.components) || []

    if (!this.components.length) {
      this.components.push(DEFAULT_COMPONENTS)
    }

    this.outputs = this.getOutputs(options, userConfig)
    this.excludePatterns = this.getExcludePatterns(options, userConfig)

    for (const component of this.components) {
      if (component.patterns) {
        this.patterns.push(...component.patterns)
      }
    }
  }

  private getOutputs (options: Options, userConfig?: ConfigSchema): OutputSchema[] {
    const generatedSchema: OutputSchema = {}

    if (options.output && options.output.length) {
      generatedSchema.path = options.output
    }

    if (options.first && options.first.length) {
      generatedSchema.groups = [
        { first: true, patterns: options.first },
        {}
      ]
    }

    if (Object.keys(generatedSchema).length || !userConfig || !userConfig.output) {
      return this.array(generatedSchema)!
    }

    return this.array(userConfig.output)!
  }

  private getExcludePatterns (options: Options, userConfig?: ConfigSchema): string[] {
    const excludePatterns: string[] = []

    if (options.exclude) {
      excludePatterns.push(...options.exclude)
    }

    if (userConfig && userConfig.excludePatterns) {
      excludePatterns.push(...userConfig.excludePatterns)
    }

    for (const component of this.components) {
      if (component.excludePatterns) {
        excludePatterns.push(...component.excludePatterns)
      }
    }

    return excludePatterns
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
