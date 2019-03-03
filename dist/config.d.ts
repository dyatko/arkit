import { Options } from './arkit';
import { ComponentSchema, ConfigSchema, OutputSchema } from './schema';
export declare const DEFAULT_CONFIG: ConfigSchema;
export declare class Config {
    directory: string;
    components: ComponentSchema[];
    outputs: OutputSchema[];
    patterns: string[];
    excludePatterns: string[];
    extensions: string[];
    constructor(options: Options);
    getOutputs(options: Options, userConfig?: ConfigSchema): OutputSchema[];
    safeRequire<T>(path: string): T | undefined;
    array<T>(input?: T | T[]): T[] | undefined;
}
