export interface Options {
  directory: string;
  config?: string;
  output?: string[];
  first?: string[];
  exclude?: string[];
}

/**
 * Configuration
 */
export interface ConfigSchema {
  /** Required list of component definitions */
  components?: ComponentSchema | ComponentSchema[];

  /** File patterns to exclude, e.g. ["node_modules/**"] */
  excludePatterns?: string[];

  /** Optional output configurations */
  output?: OutputSchema | OutputSchema[];
}

/**
 * Component definition
 */
export interface ComponentSchema {
  /** Component type, e.g. "Model" */
  type: string;

  /** File patterns to include, e.g. ["**\/*.model.ts"] */
  patterns: string[];

  /** File patterns to exclude, e.g. ["**\/*.test.ts"] */
  excludePatterns?: string[];

  /**
   * Filename format, e.g. "base", "full"
   * @default "base"
   */
  format?: ComponentNameFormat;
}

/**
 * Component name formats
 */
export enum ComponentNameFormat {
  BASE_NAME = "base",
  FULL_NAME = "full",
  COMPLETE_PATH = "complete",
}

export interface OutputSchema {
  /** Output path or paths, e.g. ["architecture.puml", "architecture.svg"] */
  path?: string | string[];

  /** Optional groups of components */
  groups?: GroupSchema[];

  /**
   * Direction, e.g. "horizontal", "vertical"
   * @default "vertical"
   */
  direction?: OutputDirection;
}

/**
 * Group of components
 */
export interface GroupSchema extends ComponentFilters {
  /** Component type, e.g. "Data-related" */
  type?: string;

  /**
   * First group
   * @default false
   */
  first?: boolean;

  /**
   * Last group
   * @default false
   */
  last?: boolean;
}

/**
 * Component filters
 */
export interface ComponentFilters {
  /** List of components, e.g. ["Service", "Model"] */
  components?: string[];

  /** File patterns, e.g. ["services\/*.ts", "**\/*.model.ts"] */
  patterns?: string[];
}

export enum OutputDirection {
  HORIZONTAL = "horizontal",
  VERTICAL = "vertical",
}

export enum OutputFormat {
  SVG = "svg",
  PNG = "png",
}
