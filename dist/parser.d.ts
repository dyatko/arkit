import { ConfigBase, Files } from "./types";
export declare class Parser {
    private readonly fs;
    constructor(config: ConfigBase);
    parse(): Files;
    private parseFile;
    private getImports;
    private getExports;
    private addModule;
}
//# sourceMappingURL=parser.d.ts.map