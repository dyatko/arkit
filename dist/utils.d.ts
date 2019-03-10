import { ComponentFilters, ComponentSchema } from './schema';
import { Component } from './types';
export declare const getPaths: (mainDirectory: string, directory: string, includePatterns: string[], excludePatterns: string[]) => string[];
export declare const match: (filepath: string, patterns?: string[] | undefined) => boolean;
export declare const find: (filepath: string, patterns: string[]) => string | undefined;
export declare const safeRequire: <T>(path: string) => T | undefined;
export declare const array: <T>(input?: T | T[] | undefined) => T[] | undefined;
export declare const verifyComponentFilters: (filters: ComponentFilters, component: Component | ComponentSchema, mainDirectory: string) => boolean;
//# sourceMappingURL=utils.d.ts.map