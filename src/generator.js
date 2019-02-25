"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const schema_1 = require("./schema");
const logger_1 = require("./logger");
const https = require("https");
const generator_base_1 = require("./generator.base");
class Generator extends generator_base_1.GeneratorBase {
    generatePlantUML(output) {
        logger_1.debug('Generating components...');
        const components = this.sortComponentsByName(this.resolveConflictingComponentNames(this.generateComponents(output)));
        logger_1.trace(Array.from(components.values()));
        logger_1.debug('Generating layers...');
        const layers = this.generateLayers(output, components);
        logger_1.trace(Array.from(layers.keys()));
        const puml = ['@startuml'];
        puml.push(this.generatePlantUMLSkin(output, layers));
        for (const [layer, components] of layers.entries()) {
            puml.push(this.generatePlantUMLLayer(layer, components));
        }
        puml.push(this.generatePlantUMLRelationships(layers));
        puml.push('');
        puml.push('@enduml');
        return puml.join('\n');
    }
    generatePlantUMLLayer(layer, components) {
        if (!components.size)
            return '';
        const puml = [''];
        const isLayer = layer !== generator_base_1.EMPTY_LAYER;
        if (isLayer)
            puml.push(`rectangle "${layer}" {`);
        for (const component of components) {
            const componentPuml = [
                this.generatePlantUMLComponent(component, generator_base_1.Context.LAYER)
            ];
            if (isLayer)
                componentPuml.unshift('  ');
            puml.push(componentPuml.join(''));
        }
        if (isLayer)
            puml.push('}');
        return puml.join('\n');
    }
    generatePlantUMLComponent(component, context) {
        const puml = [];
        const hasLayer = component.layer !== generator_base_1.EMPTY_LAYER;
        const safeName = component.name.replace(/[./]/g, '_');
        if (hasLayer) {
            puml.push(`(${component.name})`);
        }
        else {
            if (context === generator_base_1.Context.RELATIONSHIP) {
                puml.push(safeName);
            }
            else {
                puml.push('rectangle "');
                if (!component.isImported)
                    puml.push('<b>');
                puml.push(component.name);
                if (!component.isImported)
                    puml.push('</b>');
                puml.push(`" as ${safeName}`);
            }
        }
        return puml.join('');
    }
    generatePlantUMLRelationships(layers) {
        const puml = [''];
        const components = this.getAllComponents(layers, true);
        for (const component of components) {
            for (const importedFilename of component.imports) {
                const importedComponent = components.find(importedComponent => importedComponent.filename === importedFilename);
                if (importedComponent) {
                    const connectionLength = this.getConnectionLength(component, importedComponent);
                    const connectionSign = this.getConnectionSign(component, importedComponent);
                    const connection = connectionSign.repeat(connectionLength) + '>';
                    const relationshipUML = [
                        this.generatePlantUMLComponent(component, generator_base_1.Context.RELATIONSHIP),
                        connection,
                        this.generatePlantUMLComponent(importedComponent, generator_base_1.Context.RELATIONSHIP)
                    ];
                    puml.push(relationshipUML.join(' '));
                }
            }
        }
        return puml.join('\n');
    }
    getConnectionLength(component, importedComponent) {
        const numberOfLevels = path
            .dirname(path.relative(component.filename, importedComponent.filename))
            .split(path.sep).length;
        return Math.max(component.isImported ? 2 : 1, Math.min(4, numberOfLevels));
    }
    getConnectionSign(component, importedComponent) {
        if (!component.isImported)
            return '=';
        if (component.layer === importedComponent.layer && component.layer !== generator_base_1.EMPTY_LAYER)
            return '.';
        return '-';
    }
    /**
     * https://github.com/plantuml/plantuml/blob/master/src/net/sourceforge/plantuml/SkinParam.java
     */
    generatePlantUMLSkin(output, layers) {
        const puml = [''];
        puml.push('scale max 1920 width');
        const direction = output.direction || this.getAllComponents(layers).length > 20
            ? schema_1.OutputDirection.HORIZONTAL
            : schema_1.OutputDirection.VERTICAL;
        if (direction === schema_1.OutputDirection.HORIZONTAL) {
            puml.push('left to right direction');
        }
        else {
            puml.push('top to bottom direction');
        }
        puml.push(`
skinparam monochrome true
skinparam shadowing false
skinparam nodesep 20
skinparam ranksep 20
skinparam defaultFontName Tahoma
skinparam defaultFontSize 14
skinparam roundCorner 4
skinparam dpi 150
skinparam arrowThickness 0.7
skinparam packageTitleAlignment left

'oval
skinparam usecase {
  borderThickness 0.4
  fontSize 12
}

'rectangle
skinparam rectangle {
  borderThickness 1
}
    `);
        return puml.join('\n');
    }
    convertToSVG(puml) {
        return new Promise((resolve, reject) => {
            const req = https
                .request({
                hostname: 'arkit.herokuapp.com',
                port: 443,
                path: '/svg',
                method: 'post',
                headers: {
                    'Content-Type': 'text/plain',
                    'Content-Length': puml.length
                }
            }, res => {
                let svg = [''];
                res.on('data', data => svg.push(data));
                res.on('end', () => resolve(svg.join('')));
            })
                .on('error', reject);
            req.write(puml);
            req.end();
        });
    }
}
exports.Generator = Generator;
