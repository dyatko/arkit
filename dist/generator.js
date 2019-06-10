"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const utils_1 = require("./utils");
const types_1 = require("./types");
class Generator {
    constructor(config, files) {
        this.config = config;
        this.files = files;
    }
    generate(output) {
        utils_1.info("Generating components...");
        const components = this.sortComponentsByName(this.resolveConflictingComponentNames(this.generateComponents(output)));
        utils_1.trace(Array.from(components.values()));
        utils_1.info("Generating layers...");
        return this.generateLayers(output, components);
    }
    generateComponents(output) {
        const components = Object.keys(this.files).reduce((components, filename) => {
            const filepath = filename.endsWith("**")
                ? path.dirname(filename)
                : filename;
            const schema = this.findComponentSchema(output, filepath);
            if (schema) {
                const name = this.getComponentName(filepath, schema);
                const file = this.files[filename];
                const imports = Object.keys(file.imports);
                const isClass = file.exports.some(exp => !!exp.match(/^[A-Z]/));
                components.set(filename, {
                    name,
                    filename,
                    imports,
                    isClass,
                    isImported: false,
                    type: schema.type,
                    layer: types_1.EMPTY_LAYER
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
        const groups = utils_1.array(output.groups) || [{}];
        const ungroupedComponents = new Map(allComponents);
        const grouppedComponents = new Map();
        const layers = new Map();
        groups.forEach(group => {
            const layerType = group.type || types_1.EMPTY_LAYER;
            if (!layers.has(layerType)) {
                layers.set(layerType, new Set());
            }
            Array.from(ungroupedComponents.entries())
                .filter(([filename, component]) => {
                return utils_1.verifyComponentFilters(group, component, this.config.directory);
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
            utils_1.trace("Ungrouped components");
            utils_1.trace(Array.from(ungroupedComponents.values()));
        }
        const filenamesFromFirstComponents = new Set();
        for (const component of grouppedComponents.values()) {
            if (component.first) {
                this.collectImportedFilenames(component, grouppedComponents, filenamesFromFirstComponents);
            }
        }
        if (filenamesFromFirstComponents.size) {
            utils_1.trace("Filenames from first components");
            utils_1.trace(Array.from(filenamesFromFirstComponents));
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
            utils_1.trace("Ungrouped components leftovers");
            utils_1.trace(Array.from(ungroupedComponents.values()));
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
            const isIndex = name === "index";
            const shouldPrefixWithDirectory = components.length > 1 || isIndex;
            if (shouldPrefixWithDirectory) {
                for (const component of components) {
                    const componentPath = path.dirname(component.filename);
                    const dir = componentPath !== this.config.directory
                        ? path.basename(componentPath)
                        : "";
                    component.name =
                        isIndex && dir ? dir : path.join(dir, component.name);
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
        const componentSchemas = this.config.final.components;
        const componentSchema = componentSchemas.find(componentSchema => {
            const outputFilters = utils_1.array(output.groups) || [];
            const includedInOutput = !outputFilters.length ||
                outputFilters.some(outputFilter => utils_1.verifyComponentFilters(outputFilter, componentSchema, this.config.directory));
            if (includedInOutput) {
                return (!!componentSchema.patterns &&
                    utils_1.match(path.relative(this.config.directory, filename), componentSchema.patterns));
            }
            else {
                return false;
            }
        });
        if (!componentSchema) {
            utils_1.warn(`Component schema not found: ${filename}`);
        }
        return componentSchema;
    }
    getComponentName(filename, componentConfig) {
        const nameFormat = componentConfig.format;
        if (nameFormat === types_1.ComponentNameFormat.FULL_NAME) {
            return path.basename(filename);
        }
        return path.basename(filename, path.extname(filename));
    }
}
exports.Generator = Generator;
