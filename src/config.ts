import * as path from "path";
import {
  ComponentNameFormat,
  ComponentSchema,
  ConfigBase,
  ConfigSchema,
  GroupSchema,
  Options,
  OutputSchema
} from "./types";
import { array, debug, safeRequire } from "./utils";

const DEFAULT_COMPONENTS: ComponentSchema[] = [
  {
    type: "Dependency",
    patterns: ["node_modules/*"]
  },
  {
    type: "Component",
    patterns: ["**/*.ts", "**/*.js", "**/*.jsx", "**/*.tsx"]
  },
  {
    type: "Vue",
    format: ComponentNameFormat.FULL_NAME,
    patterns: ["**/*.vue"]
  }
];

export class Config implements ConfigBase {
  directory: string;
  final: ConfigSchema;
  extensions = [".js", ".ts", ".jsx", ".tsx", ".vue"];

  constructor(options: Options) {
    this.directory = options.directory;
    this.final = this.getFinalConfig(options);
  }

  private getFinalConfig(options: Options): ConfigSchema {
    const userConfig = this.getUserConfig(options);

    return {
      components: this.getFinalComponents(options, userConfig),
      excludePatterns: this.getExcludedPatterns(options, userConfig),
      output: this.getFinalOutputs(options, userConfig)
    };
  }

  private getUserConfig(options: Options): ConfigSchema | undefined {
    const userConfigPath = path.resolve(
      this.directory,
      options.config || "arkit"
    );
    const userConfig = safeRequire<ConfigSchema>(userConfigPath);
    const packageJSONPath = path.resolve(this.directory, "package");
    const packageJSON = safeRequire<any>(packageJSONPath);

    if (userConfig) {
      debug(`Found arkit config in ${userConfigPath}`);
      return userConfig;
    }

    if (packageJSON && packageJSON.arkit) {
      debug(`Found arkit config in ${packageJSONPath}`);
      return packageJSON.arkit;
    }
  }

  private getFinalComponents(
    options: Options,
    userConfig?: ConfigSchema
  ): ComponentSchema[] {
    const userComponents = userConfig && userConfig.components;
    return userComponents ? array(userComponents)! : DEFAULT_COMPONENTS;
  }

  private getFinalOutputs(
    options: Options,
    userConfig?: ConfigSchema
  ): OutputSchema[] {
    const initialOutputs = array(userConfig && userConfig.output) || [{}];
    const outputOption =
      options.output && options.output.length ? options.output : undefined;
    const firstOption =
      options.first && options.first.length ? options.first : undefined;
    const userComponents = userConfig && userConfig.components;
    const generatedGroups: GroupSchema[] = [
      { first: true, components: ["Component", "Vue"] },
      { type: "Dependencies", components: ["Dependency"] }
    ];

    if (firstOption) {
      generatedGroups[0].components = undefined;
      generatedGroups[0].patterns = firstOption;
      generatedGroups.push({}); // everything else
    }

    return initialOutputs.map(output => ({
      ...output,
      path: array(output.path || outputOption || "svg"),
      groups: output.groups || (!userComponents ? generatedGroups : undefined)
    }));
  }

  private getExcludedPatterns(
    options: Options,
    userConfig?: ConfigSchema
  ): string[] {
    const excludePatterns: string[] = [];

    if (options.exclude) {
      excludePatterns.push(...options.exclude);
    }

    if (userConfig && userConfig.excludePatterns) {
      excludePatterns.push(...userConfig.excludePatterns);
    }

    return excludePatterns;
  }
}
