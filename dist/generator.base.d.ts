import { ComponentSchema, OutputSchema, Files, Components, Layers, ConfigBase } from "./types";
export declare class GeneratorBase {
    protected config: ConfigBase;
    protected files: Files;
    constructor(config: ConfigBase, files: Files);
    protected generateComponents(output: OutputSchema): Components;
    protected generateLayers(output: OutputSchema, allComponents: Components): Layers;
    private collectImportedFilenames;
    protected resolveConflictingComponentNames(components: Components): Components;
    protected sortComponentsByName(components: Components): Components;
    protected findComponentSchema(output: OutputSchema, filename: string): ComponentSchema | undefined;
    protected getComponentName(filename: string, componentConfig: ComponentSchema): string;
}
//# sourceMappingURL=generator.base.d.ts.map