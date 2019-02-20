"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const minimatch = require("minimatch");
const path = require("path");
const https = require("https");
const config_1 = require("./config");
const logger_1 = require("./logger");
const plantumlEncoder = require("plantuml-encoder");
const EMPTY_LAYER = Symbol('__empty_layer__');
class Generator {
    constructor(config, files) {
        this.config = config;
        this.files = files;
    }
    generateComponents(output) {
        return Object.keys(this.files).reduce((components, filename) => {
            const schema = this.findComponentSchema(output, filename);
            if (schema) {
                const name = this.getComponentName(filename, schema);
                components.set(filename, {
                    name,
                    filename,
                    type: schema.type,
                    layer: EMPTY_LAYER,
                    imports: Object.keys(this.files[filename].imports)
                });
            }
            return components;
        }, new Map());
    }
    generateLayers(output, allComponents) {
        const groups = this.config.array(output.groups) || [{}];
        const ungroupedComponents = new Map(allComponents);
        const grouppedComponents = new Map();
        const layers = new Map();
        groups.forEach(group => {
            const layerType = group.type || EMPTY_LAYER;
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
            if (differentFilenames.size > 1) {
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
        const componentSchema = this.config.components.find(component => {
            const includedInOutput = !output.components ||
                !output.components.length ||
                output.components.some(outputComponent => outputComponent === component.type);
            if (includedInOutput) {
                return !!component.patterns && component.patterns.some(pattern => this.match(filename, pattern));
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
        const matchesPatterns = !filters.patterns || filters.patterns.some(pattern => this.match(component.filename, pattern));
        const matchesComponents = !filters.components || filters.components.some(type => type === component.type);
        return matchesPatterns && matchesComponents;
    }
    getComponentName(filename, componentConfig) {
        const nameFormat = componentConfig.format;
        if (nameFormat === config_1.ComponentNameFormat.FULL_NAME) {
            return path.basename(filename);
        }
        return path.basename(filename, path.extname(filename));
    }
    match(filename, pattern) {
        return minimatch(filename, pattern.replace(/^\.\//, ''));
    }
    generatePlantUML(output) {
        logger_1.debug('Generating components...');
        const components = this.sortComponentsByName(this.resolveConflictingComponentNames(this.generateComponents(output)));
        logger_1.trace(Array.from(components.values()));
        logger_1.debug('Generating layers...');
        const layers = this.generateLayers(output, components);
        logger_1.trace(Array.from(layers.keys()));
        const puml = ['@startuml'];
        puml.push(this.generatePlantUMLSkin(output));
        for (const [layer, components] of layers.entries()) {
            puml.push(this.generatePlantUMLLayer(layer, components));
        }
        puml.push(this.generatePlantUMLRelationships(layers));
        puml.push('');
        puml.push('@enduml');
        return puml.join('\n');
    }
    convertToSVG(puml) {
        const encoded = plantumlEncoder.encode(puml);
        return new Promise((resolve, reject) => {
            https.get(`https://www.plantuml.com/plantuml/svg/${encoded}`, res => {
                let svg = [''];
                res.on('data', data => svg.push(data));
                res.on('end', () => resolve(svg.join('')));
            }).on('error', reject);
        });
    }
    generatePlantUMLLayer(layer, components) {
        if (!components.size)
            return '';
        const puml = [''];
        const isLayer = typeof layer === 'string';
        if (isLayer)
            puml.push(`package "${layer}" {`);
        for (const component of components) {
            puml.push(this.generatePlantUMLComponent(component, layer));
        }
        if (isLayer)
            puml.push('}');
        return puml.join('\n');
    }
    generatePlantUMLComponent(component, layer) {
        const puml = [];
        puml.push('(');
        puml.push(component.name);
        puml.push(')');
        if (typeof layer === 'string') {
            puml.unshift('  ');
        }
        return puml.join('');
    }
    generatePlantUMLRelationships(layers) {
        const puml = [''];
        const components = []
            .concat(...[...layers.values()].map(components => [...components]))
            .sort((a, b) => a.name.localeCompare(b.name));
        for (const component of components) {
            for (const importedFilename of component.imports) {
                const importedComponent = components.find(importedComponent => importedComponent.filename === importedFilename);
                if (!importedComponent)
                    continue;
                const numberOfLevels = path.dirname(path.relative(component.filename, importedFilename)).split(path.sep).length;
                const connectionLength = Math.max(1, Math.min(4, numberOfLevels));
                const connectionSign = component.layer === importedComponent.layer && typeof component.layer === 'string' ? '~' : '-';
                const connection = connectionSign.repeat(connectionLength) + '>';
                puml.push([
                    this.generatePlantUMLComponent(component),
                    connection,
                    this.generatePlantUMLComponent(importedComponent)
                ].join(' '));
            }
        }
        return puml.join('\n');
    }
    generatePlantUMLSkin(output) {
        const puml = [''];
        if (output.direction === config_1.OutputDirection.HORIZONTAL) {
            puml.push('left to right direction');
        }
        else {
            puml.push('top to bottom direction');
        }
        puml.push('skinparam monochrome true');
        puml.push('skinparam shadowing false');
        puml.push('skinparam nodesep 16');
        return puml.join('\n');
    }
}
exports.Generator = Generator;
