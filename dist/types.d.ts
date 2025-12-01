import { ConfigSchema } from "./schema";
export * from "./schema";
export declare const EMPTY_LAYER: unique symbol;
export interface Components extends Map<string, Component> {
}
export interface Layers extends Map<string | typeof EMPTY_LAYER, Set<Component>> {
}
export declare enum Context {
    LAYER = 0,
    RELATIONSHIP = 1
}
export interface Component {
    name: string;
    type: string;
    filename: string;
    imports: string[];
    layer: string | typeof EMPTY_LAYER;
    isImported: boolean;
    isClass: boolean;
    first?: boolean;
    last?: boolean;
}
export interface Imports {
    [file: string]: string[];
}
export interface Exports extends Array<string> {
}
export interface File {
    imports: Imports;
    exports: Exports;
}
export interface Files {
    [file: string]: File;
}
export declare abstract class ConfigBase {
    readonly directory: string;
    readonly final: ConfigSchema;
    extensions: string[];
}
export declare class SavedString extends String {
    path?: string;
}
//# sourceMappingURL=types.d.ts.map