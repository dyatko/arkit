import { createMatchPath, loadConfig, MatchPath } from "tsconfig-paths";
import { debug, info, trace, warn } from "./logger";
import { Project, SourceFile } from "ts-morph";
import { ComponentSchema } from "./schema";
import { getPaths } from "./utils";
import { ConfigBase } from "./types";
import { sync as resolveSync } from "resolve";

export class FileSystem {
  private readonly config: ConfigBase;
  private tsResolve?: MatchPath;
  private tsConfigFilePath?: string;
  project: Project;
  filePaths: string[] = [];
  folderPaths: string[] = [];

  constructor(config: ConfigBase) {
    this.config = config;

    this.prepareProject();
    this.preparePaths();
  }

  private resolveTsConfigPaths() {
    const tsConfig = loadConfig(this.config.directory);

    if (tsConfig.resultType === "success") {
      this.tsConfigFilePath = tsConfig.configFileAbsolutePath;
      debug("Found TypeScript config", this.tsConfigFilePath);
      debug("Registering ts-config paths...");
      debug(tsConfig.paths);
      this.tsResolve = createMatchPath(
        tsConfig.absoluteBaseUrl,
        tsConfig.paths,
        tsConfig.mainFields,
        tsConfig.addMatchAll
      );
    } else {
      this.tsResolve = createMatchPath(
        this.config.directory,
        {
          "~/*": ["*"],
          "@/*": ["*", "src/*"]
        },
        undefined,
        true
      );
    }
  }

  private prepareProject() {
    try {
      this.resolveTsConfigPaths();
    } catch (e) {
      warn(e);
      this.tsConfigFilePath = undefined;
    }

    this.project = new Project({
      tsConfigFilePath: this.tsConfigFilePath,
      addFilesFromTsConfig: false,
      skipFileDependencyResolution: true
    });
  }

  private preparePaths() {
    const components = this.config.final.components as ComponentSchema[];
    const excludePatterns = [
      ...(this.config.final.excludePatterns as string[])
    ];
    const includePatterns: string[] = [];

    components.forEach(component => {
      includePatterns.push(...component.patterns);

      if (component.excludePatterns) {
        excludePatterns.push(...component.excludePatterns);
      }
    });

    info("Searching files...");
    getPaths(
      this.config.directory,
      "",
      includePatterns,
      excludePatterns
    ).forEach(path => {
      if (path.endsWith("**")) {
        this.folderPaths.push(path);
      } else {
        this.filePaths.push(path);
      }
    });
  }

  getModulePath(
    moduleSpecifier: string,
    sourceFile: SourceFile
  ): string | undefined {
    try {
      trace(
        moduleSpecifier,
        sourceFile.getDirectoryPath(),
        this.config.extensions
      );
      return resolveSync(moduleSpecifier, {
        basedir: sourceFile.getDirectoryPath(),
        extensions: this.config.extensions
      });
    } catch (e) {
      return this.resolveTsModule(moduleSpecifier);
    }
  }

  private resolveTsModule(moduleSpecifier): string | undefined {
    if (!this.tsResolve) return;

    const modulePath = this.tsResolve(
      moduleSpecifier,
      undefined,
      undefined,
      this.config.extensions
    );
    debug("Resolve TS", moduleSpecifier, modulePath);

    if (!modulePath) return;

    return resolveSync(modulePath, {
      extensions: this.config.extensions
    });
  }
}
