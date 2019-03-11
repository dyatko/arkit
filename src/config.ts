import * as path from 'path'
import { ComponentSchema, ConfigBase, ConfigSchema, Options, OutputSchema } from './types'
import { debug, array, safeRequire } from './utils'

const DEFAULT_COMPONENTS: ComponentSchema[] = [
  {
    type: 'Dependency',
    patterns: ['node_modules/*']
  },
  {
    type: 'Component',
    patterns: ['**/*.ts', '**/*.js', '**/*.jsx', '**/*.tsx']
  }
]

export class Config implements ConfigBase {
  directory: string
  components: ComponentSchema[]
  outputs: OutputSchema[]
  patterns: string[] = []
  excludePatterns: string[]
  extensions = ['.js', '.ts', '.jsx', '.tsx']

  constructor (options: Options) {
    this.directory = options.directory
    const userConfig = this.getUserConfig()
    const userComponents = userConfig && userConfig.components

    this.components = userComponents ? array(userComponents)! : DEFAULT_COMPONENTS
    this.outputs = this.getOutputs(options, userConfig)
    this.excludePatterns = this.getExcludePatterns(options, userConfig)

    for (const component of this.components) {
      if (component.patterns) {
        this.patterns.push(...component.patterns)
      }
    }
  }

  private getUserConfig (): ConfigSchema | undefined {
    const userConfigPath = path.resolve(this.directory, 'arkit')
    const userConfig = safeRequire<ConfigSchema>(userConfigPath)
    const packageJSONPath = path.resolve(this.directory, 'package')
    const packageJSON = safeRequire<any>(packageJSONPath)

    if (userConfig) {
      debug(`Found arkit config in ${userConfigPath}`)
      return userConfig
    }

    if (packageJSON && packageJSON.arkit) {
      debug(`Found arkit config in ${packageJSONPath}`)
      return packageJSON.arkit
    }
  }

  private getOutputs (options: Options, userConfig?: ConfigSchema): OutputSchema[] {
    const userConfigOutput = array(userConfig && userConfig.output) || [{}]
    const outputOption = options.output && options.output.length ? options.output : undefined
    const firstOption = options.first && options.first.length ? options.first : undefined
    const hasDefaultComponents = this.components === DEFAULT_COMPONENTS ? true : undefined
    const generatedGroups = hasDefaultComponents && [
      { first: true, components: firstOption ? undefined : ['Component'], patterns: firstOption },
      { type: 'Dependencies', components: ['Dependency'] },
      {} // everything else
    ]

    return userConfigOutput.map(output => ({
      ...output,
      path: output.path || outputOption,
      groups: output.groups || generatedGroups
    }))
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
