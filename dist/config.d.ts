import { ComponentSchema, Options, OutputSchema } from './schema';
export declare class Config {
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