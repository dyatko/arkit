import { ConfigBase, ConfigSchema, Options } from "./types";
export declare class Config implements ConfigBase {
    directory: string;
    final: ConfigSchema;
    extensions: string[];
    constructor(options: Options);
    private getFinalConfig;
    private getUserConfig;
    private getFinalComponents;
    private getFinalOutputs;
    private getExcludedPatterns;
}
//# sourceMappingURL=config.d.ts.map