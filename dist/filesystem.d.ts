import { Project, SourceFile } from "ts-morph";
import { ConfigBase } from "./types";
export declare class FileSystem {
    private readonly config;
    private tsResolve?;
    private tsConfigFilePath?;
    project: Project;
    filePaths: string[];
    folderPaths: string[];
    constructor(config: ConfigBase);
    private resolveTsConfigPaths;
    private prepareProject;
    private preparePaths;
    getModulePath(moduleSpecifier: string, sourceFile: SourceFile): string | undefined;
    private resolveTsModule;
}
//# sourceMappingURL=filesystem.d.ts.map