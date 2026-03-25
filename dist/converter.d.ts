import { ConfigBase, SavedString } from "./types";
export type ConverterBackend = "wasm" | "java";
export declare class Converter {
    private readonly config;
    private backend;
    constructor(config: ConfigBase);
    private getDotWrapperPath;
    private initializeBackend;
    convert(pathOrType: string, puml: string): Promise<SavedString>;
    private save;
    requestChain: Promise<any>;
    convertToImage(puml: string, format: string): Promise<Buffer>;
    private convertWithWasm;
    private convertWithSystemGraphviz;
    private getSystemDependencyErrorMessage;
}
//# sourceMappingURL=converter.d.ts.map