import { ComponentSchema, Options, OutputSchema } from './schema';
export declare class Config {
    directory: string;
    components: ComponentSchema[];
    outputs: OutputSchema[];
    patterns: string[];
    excludePatterns: string[];
    extensions: string[];
    constructor(options: Options);
    private getOutputs;
    private getExcludePatterns;
    safeRequire<T>(path: string): T | undefined;
    array<T>(input?: T | T[]): T[] | undefined;
}
//# sourceMappingURL=config.d.ts.map