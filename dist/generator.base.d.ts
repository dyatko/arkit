import { Config } from './config';
import { ComponentFilters, ComponentSchema, OutputSchema } from './schema';
import { Files } from './parser';
export declare const EMPTY_LAYER: unique symbol;
export interface Component {
    name: string;
    type: string;
    filename: string;
    imports: string[];
    layer: string | typeof EMPTY_LAYER;
    isImported: boolean;
    first?: boolean;
    last?: boolean;
}
export interface Components extends Map<string, Component> {
}
export interface Layers extends Map<string | typeof EMPTY_LAYER, Set<Component>> {
}
export declare enum Context {
    LAYER = 0,
    RELATIONSHIP = 1
}
export declare class GeneratorBase {
    protected config: Config;
    private files;
    constructor(config: Config, files: Files);
    protected generateComponents(output: OutputSchema): Components;
    protected generateLayers(output: OutputSchema, allComponents: Components): Layers;
    private collectImportedFilenames;
    protected resolveConflictingComponentNames(components: Components): Components;
    protected sortComponentsByName(components: Components): Components;
    protected findComponentSchema(output: OutputSchema, filename: string): ComponentSchema;
    protected verifyComponentFilters(filters: ComponentFilters, component: Component | ComponentSchema): boolean;
    protected getComponentName(filename: string, componentConfig: ComponentSchema): string;
    protected getAllComponents(layers: Layers, sortByName?: boolean): Component[];
}
