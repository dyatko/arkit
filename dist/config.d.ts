import { ComponentSchema, ConfigBase, Options, OutputSchema } from './types';
export declare class Config implements ConfigBase {
    directory: string;
    components: ComponentSchema[];
    outputs: OutputSchema[];
    patterns: string[];
    excludePatterns: string[];
    extensions: string[];
    constructor(options: Options);
    private getUserConfig;
    private getOutputs;
    private getExcludePatterns;
}
//# sourceMappingURL=config.d.ts.map