import { Config } from './config';
interface Imports {
    [file: string]: string[];
}
interface Exports extends Array<string> {
}
export interface File {
    imports: Imports;
    exports: Exports;
}
export interface Files {
    [file: string]: File;
}
export declare class Parser {
    private config;
    private project;
    private sourceFiles;
    private sourceFolders;
    private tsResolve?;
    private tsConfigFilePath?;
    constructor(config: Config);
    private resolveTsConfigPaths;
    private prepareProject;
    private getPaths;
    private cleanProject;
    private shouldInclude;
    private shouldExclude;
    parse(): Files;
    private getImports;
    private getExports;
    private addModule;
    private getModulePath;
    private resolveTsModule;
}
export {};
//# sourceMappingURL=parser.d.ts.map