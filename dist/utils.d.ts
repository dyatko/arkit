import { Component, ComponentFilters, ComponentSchema, Layers } from "./types";
import { Node, Statement } from "ts-morph";
export * from "./logger";
export declare const getStats: (path: string) => {
    isDirectory: boolean;
    isFile: boolean;
};
export declare const getMemoryUsage: () => number;
export declare const getPaths: (mainDirectory: string, directory: string, includePatterns: string[], excludePatterns: string[], history?: string[]) => string[];
export declare const match: (filepath: string, patterns?: string[]) => boolean;
export declare const find: (filepath: string, patterns: string[]) => string | undefined;
export declare const safeRequire: <T>(path: string) => T | undefined;
export declare const array: <T>(input?: T | T[]) => T[] | undefined;
export declare const verifyComponentFilters: (filters: ComponentFilters, component: Component | ComponentSchema, mainDirectory: string) => boolean;
export declare const bold: (str: string) => string;
/**
 * @deprecated This function is no longer used. PlantUML conversion is now done locally using node-plantuml.
 * Kept for backward compatibility only.
 */
export declare const request: (path: any, payload: any) => Promise<Buffer>;
export declare const getAllComponents: (layers: Layers, sortByName?: boolean) => Component[];
export declare const getAbsolute: (filepath: string, root?: string) => string;
export declare const convertToRelative: (paths: string[], root: string, excludes?: string[]) => string[];
export declare const getAllStatements: (nodes: Node[], statements?: Statement[]) => Statement[];
//# sourceMappingURL=utils.d.ts.map