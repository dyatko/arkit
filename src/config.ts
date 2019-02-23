import * as path from 'path'
import { info, warn } from './logger'

/**
 * Configuration
 */
export interface ConfigSchema {
  /** Required list of component definitions */
  components: ComponentSchema | ComponentSchema[]

  /** File patterns to exclude, e.g. ["node_modules/**"] */
  excludePatterns?: string[]

  /** Optional output configurations */
  output?: OutputSchema | OutputSchema[]
}

/**
 * Component definition
 */
export interface ComponentSchema {
  /** Component type, e.g. "Model" */
  type: string

  /** File patterns to include, e.g. ["**\/*.model.ts"] */
  patterns: string[]

  /** File patterns to exclude, e.g. ["**\/*.test.ts"] */
  excludePatterns?: string[]

  /**
   * Filename format, e.g. "base", "full"
   * @default "base"
   */
  format?: ComponentNameFormat
}

/**
 * Component name formats
 */
export enum ComponentNameFormat {
  BASE_NAME = 'base',
  FULL_NAME = 'full',
  COMPLETE_PATH = 'complete'
}

export interface OutputSchema extends ComponentFilters {
  /** Output path or paths, e.g. ["architecture.puml", "architecture.svg"] */
  path?: string | string[]

  /** Optional groups of components */
  groups?: GroupSchema | GroupSchema[]

  /**
   * Direction, e.g. "horizontal", "vertical"
   * @default "vertical"
   */
  direction?: OutputDirection
}

/**
 * Group of components
 */
export interface GroupSchema extends ComponentFilters {
  /** Component type, e.g. "Data-related" */
  type?: string

  /**
   * First group
   * @default false
   */
  first?: boolean

  /**
   * Last group
   * @default false
   */
  last?: boolean
}

/**
 * Component filters
 */
export interface ComponentFilters {
  /** List of components, e.g. ["Service", "Model"] */
  components?: string[]

  /** File patterns, e.g. ["services\/*.ts", "**\/*.model.ts"] */
  patterns?: string[]
}

export enum OutputDirection {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical'
}

export const DEFAULT_CONFIG: ConfigSchema = {
  components: {
    type: 'Component',
    patterns: ['**/*.ts', '**/*.js']
  },
  excludePatterns: ['node_modules/**', 'test/**', '**/*.test.*', '**/*.spec.*'],
  output: {}
}

export class Config {
  components: ComponentSchema[]
  outputs: OutputSchema[]
  patterns: string[] = []
  excludePatterns: string[] = []
  extensions = ['.js', '.ts', '.jsx', '.tsx']

  constructor (public directory: string) {
    info('Working directory', directory)

    const userConfigPath = path.join(this.directory, 'arkit')
    const userConfig = this.safeRequire<ConfigSchema>(userConfigPath)

    this.components = this.array(userConfig && userConfig.components || DEFAULT_CONFIG.components)!
    this.outputs = this.array(userConfig && userConfig.output || DEFAULT_CONFIG.output)!

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

  safeRequire <T> (path: string): T | undefined {
    try {
      return require(path)
    } catch (e) {
      warn(e.toString())
    }
  }

  array<T> (input?: T | T[]): T[] | undefined {
    if (input) {
      return ([] as T[]).concat(input)
    }
  }
}
