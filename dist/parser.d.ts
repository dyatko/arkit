import { ConfigBase, Files } from "./types";
export declare class Parser {
    private readonly config;
    private project;
    private filePaths;
    private folderPaths;
    private tsResolve?;
    private tsConfigFilePath?;
    constructor(config: ConfigBase);
    private resolveTsConfigPaths;
    private prepareProject;
    private preparePaths;
    private cleanProject;
    parse(): Files;
    private parseFile;
    private getImports;
    private getExports;
    private addModule;
    private getModulePath;
    private resolveTsModule;
}
//# sourceMappingURL=parser.d.ts.map