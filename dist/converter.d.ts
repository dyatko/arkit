/// <reference types="node" />
import { ConfigBase, SavedString } from "./types";
export declare class Converter {
    private readonly config;
    constructor(config: ConfigBase);
    convert(pathOrType: string, puml: string): Promise<SavedString>;
    private save;
    requestChain: Promise<any>;
    convertToImage(puml: string, format: string): Promise<Buffer>;
}
//# sourceMappingURL=converter.d.ts.map