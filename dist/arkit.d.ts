import { Config } from "./config";
import { Options, SavedString } from "./types";
export declare const getConfig: (options?: Options) => Config;
export declare const getOutputs: (config: Config) => Promise<SavedString[]>;
export declare const arkit: (options?: Options) => Promise<SavedString[]>;
//# sourceMappingURL=arkit.d.ts.map