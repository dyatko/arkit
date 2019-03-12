import { Config } from './config';
import { Options } from './types';
export declare const getConfig: (options?: Options | undefined) => Config;
export declare const getOutputs: (config: Config) => Promise<string[]>;
export declare const arkit: (options?: Options | undefined) => Promise<string[]>;
//# sourceMappingURL=arkit.d.ts.map