import { Config } from "./config";
import { Options, SavedString } from "./types";
export declare const getConfig: (options?: Options | undefined) => Config;
export declare const getOutputs: (config: Config) => Promise<SavedString[]>;
export declare const arkit: (options?: Options | undefined) => Promise<SavedString[]>;
//# sourceMappingURL=arkit.d.ts.map