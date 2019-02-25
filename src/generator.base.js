"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schema_1 = require("./schema");
const logger_1 = require("./logger");
const path = require("path");
const nanomatch = require("nanomatch");
exports.EMPTY_LAYER = Symbol('__empty_layer__');
var Context;
(function (Context) {
    Context[Context["LAYER"] = 0] = "LAYER";
    Context[Context["RELATIONSHIP"] = 1] = "RELATIONSHIP";
})(Context = exports.Context || (exports.Context = {}));
class GeneratorBase {
    constructor(config, files) {
        this.config = config;
        this.files = files;
    }
    generateComponents(output) {
        const components = Object.keys(this.files).reduce((components, filename) => {
            const schema = this.findComponentSchema(output, filename);
            if (schema) {
                const name = this.getComponentName(filename, schema);
                components.set(filename, {
                    name,
                    filename,
                    isImported: false,
                    type: schema.type,
                    layer: exports.EMPTY_LAYER,
                    imports: Object.keys(this.files[filename].imports)
                });
            }
            return components;
        }, new Map());
        for (const component of components.values()) {
            for (const potentialComponent of components.values()) {
                if (potentialComponent.imports.includes(component.filename)) {
                    component.isImported = true;
                    break;
                }
            }
        }
        return components;
    }
    generateLayers(output, allComponents) {
        const groups = this.config.array(output.groups) || [{}];
        const ungroupedComponents = new Map(allComponents);
        const grouppedComponents = new Map();
        const layers = new Map();
        groups.forEach(group => {
            const layerType = group.type || exports.EMPTY_LAYER;
            if (!layers.has(layerType)) {
                layers.set(layerType, new Set());
            }
            Array.from(ungroupedComponents.entries())
                .filter(([filename, component]) => {
                return this.verifyComponentFilters(group, component);
            })
                .forEach(([filename, component]) => {
                component.layer = layerType;
                component.first = group.first;
                component.last = group.last;
                layers.get(layerType).add(component);
                grouppedComponents.set(component.filename, component);
                ungroupedComponents.delete(filename);
                return component;
            });
        });
        if (ungroupedComponents.size) {
            logger_1.trace('Ungrouped components');
            logger_1.trace(Array.from(ungroupedComponents.values()));
        }
        const filenamesFromFirstComponents = new Set();
        for (const component of grouppedComponents.values()) {
            if (component.first) {
                this.collectImportedFilenames(component, grouppedComponents, filenamesFromFirstComponents);
            }
        }
        if (filenamesFromFirstComponents.size) {
            logger_1.trace('Filenames from first components');
            logger_1.trace(Array.from(filenamesFromFirstComponents));
            for (const [filename, component] of allComponents) {
                if (!filenamesFromFirstComponents.has(filename)) {
                    for (const components of layers.values()) {
                        components.delete(component);
                    }
                    ungroupedComponents.delete(filename);
                    allComponents.delete(filename);
                }
            }
        }
        if (ungroupedComponents.size) {
            logger_1.trace('Ungrouped components leftovers');
            logger_1.trace(Array.from(ungroupedComponents.values()));
        }
        return layers;
    }
    collectImportedFilenames(component, components, filenames) {
        if (filenames.has(component.filename))
            return;
        filenames.add(component.filename);
        if (!component.last) {
            component.imports.forEach(importedFilename => {
                const importedComponent = components.get(importedFilename);
                if (importedComponent) {
                    this.collectImportedFilenames(importedComponent, components, filenames);
                }
            });
        }
        else {
            component.imports = [];
        }
    }
    resolveConflictingComponentNames(components) {
        const componentsByName = {};
        for (const component of components.values()) {
            componentsByName[component.name] = componentsByName[component.name] || [];
            componentsByName[component.name].push(component);
        }
        for (const name in componentsByName) {
            const components = componentsByName[name];
            const differentFilenames = new Set(components.map(component => component.filename));
            const shouldPrefixWithDirectory = differentFilenames.size > 1 || name === 'index';
            if (shouldPrefixWithDirectory) {
                for (const component of components) {
                    const dir = path.basename(path.dirname(component.filename));
                    component.name = path.join(dir, component.name);
                }
            }
        }
        return components;
    }
    sortComponentsByName(components) {
        const sortedComponents = new Map(Array.from(components.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name)));
        for (const component of components.values()) {
            component.imports = component.imports
                .filter(importedFilename => components.has(importedFilename))
                .sort((a, b) => {
                const componentA = components.get(a);
                const componentB = components.get(b);
                return componentA.name.localeCompare(componentB.name);
            });
        }
        return sortedComponents;
    }
    findComponentSchema(output, filename) {
        const componentSchema = this.config.components.find(componentSchema => {
            const outputFilters = [output, ...this.config.array(output.groups) || []];
            const includedInOutput = outputFilters.some(outputFilter => this.verifyComponentFilters(outputFilter, componentSchema));
            if (includedInOutput) {
                return !!componentSchema.patterns && nanomatch.some(filename, componentSchema.patterns);
            }
            else {
                return false;
            }
        });
        if (!componentSchema) {
            throw new Error(`Component schema not found: ${filename}`);
        }
        return componentSchema;
    }
    verifyComponentFilters(filters, component) {
        const matchesPatterns = !('filename' in component) || !filters.patterns || nanomatch.some(component.filename, filters.patterns);
        const matchesComponents = !filters.components || filters.components.some(type => type === component.type);
        return matchesPatterns && matchesComponents;
    }
    getComponentName(filename, componentConfig) {
        const nameFormat = componentConfig.format;
        const a = 1;
        if (nameFormat === schema_1.ComponentNameFormat.FULL_NAME) {
            return path.basename(filename);
        }
        return path.basename(filename, path.extname(filename));
    }
    getAllComponents(layers) {
        return []
            .concat(...[...layers.values()].map(components => [...components]));
    }
}
exports.GeneratorBase = GeneratorBase;
