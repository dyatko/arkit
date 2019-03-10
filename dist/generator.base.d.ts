import { Config } from './config';
import { ComponentSchema, OutputSchema } from './schema';
import { Files, Component, Components, Layers } from './types';
export declare class GeneratorBase {
    protected config: Config;
    private files;
    constructor(config: Config, files: Files);
    protected generateComponents(output: OutputSchema): Components;
    protected generateLayers(output: OutputSchema, allComponents: Components): Layers;
    private collectImportedFilenames;
    protected resolveConflictingComponentNames(components: Components): Components;
    protected sortComponentsByName(components: Components): Components;
    protected findComponentSchema(output: OutputSchema, filename: string): ComponentSchema | undefined;
    protected getComponentName(filename: string, componentConfig: ComponentSchema): string;
    protected getAllComponents(layers: Layers, sortByName?: boolean): Component[];
}
//# sourceMappingURL=generator.base.d.ts.map