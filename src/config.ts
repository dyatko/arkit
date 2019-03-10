import * as path from 'path'
import { ComponentSchema, ConfigSchema, Options, OutputSchema } from './schema'
import { array, safeRequire } from './utils'

const DEFAULT_COMPONENTS: ComponentSchema[] = [
  {
    type: 'Component',
    patterns: ['**/*.ts', '**/*.js', '**/*.jsx', '**/*.tsx']
  },
  {
    type: 'Dependency',
    patterns: ['node_modules/*']
  }
]

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
    const userConfig = safeRequire<ConfigSchema>(userConfigPath)

    this.components = array(userConfig && userConfig.components) || []

    if (!this.components.length) {
      this.components.push(...DEFAULT_COMPONENTS)
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
    const userConfigOutput = userConfig && userConfig.output
    const outputOption = options.output && options.output.length ? options.output : undefined
    const firstOption = options.first && options.first.length ? options.first : undefined
    const shouldGenerateOutput = outputOption || firstOption || !userConfigOutput

    if (!shouldGenerateOutput) {
      return array(userConfigOutput)!
    }

    const firstGroup = firstOption ? [{
      first: true,
      patterns: firstOption
    }] : []

    return [
      {
        path: outputOption,
        groups: [
          ...firstGroup,
          { type: 'Dependencies', components: ['Dependency'] },
          {} // everything else
        ]
      }
    ]
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
}
