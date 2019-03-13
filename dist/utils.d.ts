import { Component, ComponentFilters, ComponentSchema } from "./types";
export * from "./logger";
export declare const getStats: (path: string) => {
    isDirectory: boolean;
    isFile: boolean;
};
export declare const getMemoryUsage: () => number;
export declare const getPaths: (mainDirectory: string, directory: string, includePatterns: string[], excludePatterns: string[], history?: string[]) => string[];
export declare const match: (filepath: string, patterns?: string[] | undefined) => boolean;
export declare const find: (filepath: string, patterns: string[]) => string | undefined;
export declare const safeRequire: <T>(path: string) => T | undefined;
export declare const array: <T>(input?: T | T[] | undefined) => T[] | undefined;
export declare const verifyComponentFilters: (filters: ComponentFilters, component: ComponentSchema | Component, mainDirectory: string) => boolean;
export declare const bold: (str: string) => string;
//# sourceMappingURL=utils.d.ts.map