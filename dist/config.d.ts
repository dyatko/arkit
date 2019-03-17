import { ConfigBase, ConfigSchema, Options } from "./types";
export declare class Config implements ConfigBase {
    readonly directory: string;
    readonly final: ConfigSchema;
    extensions: string[];
    constructor(options: Options);
    private getUserConfig;
    private getFinalConfig;
    private getFinalComponents;
    private getFinalOutputs;
    private getExcludedPatterns;
}
//# sourceMappingURL=config.d.ts.map