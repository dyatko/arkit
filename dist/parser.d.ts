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
    private tsResolve?;
    private tsConfigFilePath?;
    private tsResolutionCache;
    constructor(config: Config);
    private resolveTsConfigPaths;
    parse(): Files;
    private getImports;
    private addImportedFile;
    private getExports;
    private resolveModule;
    private resolveTsModule;
}
export {};
//# sourceMappingURL=parser.d.ts.map