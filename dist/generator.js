"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const https = require("https");
const utils_1 = require("./utils");
const generator_base_1 = require("./generator.base");
const types_1 = require("./types");
const ProgressBar = require("progress");
class Generator extends generator_base_1.GeneratorBase {
    constructor() {
        super(...arguments);
        this.requestChain = Promise.resolve();
    }
    generate() {
        const outputs = this.config.final.output;
        const total = outputs.reduce((total, output) => total + utils_1.array(output.path).length, outputs.length);
        this.progress = new ProgressBar('Generating :bar', {
            total,
            clear: true,
            width: process.stdout.columns
        });
        return Promise.all(outputs.reduce((promises, output) => {
            let puml = this.generatePlantUML(output);
            this.progress.tick();
            puml = `${puml}

' View and edit on https://arkit.herokuapp.com`;
            if (output.path && output.path.length) {
                for (const outputPath of utils_1.array(output.path)) {
                    const promise = this.convert(outputPath, puml).then(value => {
                        this.progress.tick();
                        return value;
                    });
                    promises.push(promise);
                }
            }
            return promises;
        }, []));
    }
    generatePlantUML(output) {
        utils_1.info('Generating components...');
        const components = this.sortComponentsByName(this.resolveConflictingComponentNames(this.generateComponents(output)));
        utils_1.trace(Array.from(components.values()));
        utils_1.info('Generating layers...');
        const layers = this.generateLayers(output, components);
        const layerComponents = this.getAllComponents(layers, true);
        utils_1.trace(Array.from(layers.keys()));
        const puml = ['@startuml'];
        puml.push(this.generatePlantUMLSkin(output, layers));
        for (const [layer, components] of layers.entries()) {
            puml.push(this.generatePlantUMLLayer(layer, components));
        }
        puml.push(this.generatePlantUMLRelationships(layerComponents));
        puml.push('');
        puml.push('@enduml');
        return puml.join('\n');
    }
    generatePlantUMLLayer(layer, components) {
        if (!components.size)
            return '';
        const puml = [''];
        const isLayer = layer !== types_1.EMPTY_LAYER;
        if (isLayer)
            puml.push(`package "${layer}" {`);
        for (const component of components) {
            const componentPuml = [
                this.generatePlantUMLComponent(component, types_1.Context.LAYER)
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
        const isDirectory = component.filename.endsWith('**');
        const hasLayer = component.layer !== types_1.EMPTY_LAYER;
        let name = component.name;
        const safeName = '_' + name.replace(/[^\w]/g, '_');
        if ((isDirectory && !hasLayer) || (!isDirectory && !component.isImported)) {
            name = utils_1.bold(name);
        }
        if (isDirectory) {
            if (hasLayer) {
                puml.push(`[${name}]`);
            }
            else if (context === types_1.Context.RELATIONSHIP) {
                puml.push(safeName);
            }
            else {
                puml.push(`[${name}] as ${safeName}`);
            }
        }
        else if (!component.isClass) {
            puml.push(`(${name})`);
        }
        else if (context === types_1.Context.RELATIONSHIP) {
            puml.push(safeName);
        }
        else {
            puml.push(`rectangle "${name}" as ${safeName}`);
        }
        return puml.join('');
    }
    generatePlantUMLRelationships(components) {
        const puml = [''];
        for (const component of components) {
            for (const importedFilename of component.imports) {
                const importedComponent = components.find(importedComponent => importedComponent.filename === importedFilename);
                if (importedComponent) {
                    const connectionLength = this.getConnectionLength(component, importedComponent);
                    const connectionSign = this.getConnectionSign(component, importedComponent);
                    const connectionStyle = this.getConnectionStyle(component);
                    const connection = connectionSign.repeat(connectionLength) + connectionStyle + '>';
                    const relationshipUML = [
                        this.generatePlantUMLComponent(component, types_1.Context.RELATIONSHIP),
                        connection,
                        this.generatePlantUMLComponent(importedComponent, types_1.Context.RELATIONSHIP)
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
        if (component.layer === importedComponent.layer && component.layer !== types_1.EMPTY_LAYER)
            return '.';
        return '-';
    }
    getConnectionStyle(component) {
        if (!component.isImported)
            return '[thickness=1]';
        return '';
    }
    /**
     * https://github.com/plantuml/plantuml/blob/master/src/net/sourceforge/plantuml/SkinParam.java
     */
    generatePlantUMLSkin(output, layers) {
        const puml = [''];
        puml.push('scale max 1920 width');
        const direction = output.direction || this.getAllComponents(layers).length > 20
            ? types_1.OutputDirection.HORIZONTAL
            : types_1.OutputDirection.VERTICAL;
        if (direction === types_1.OutputDirection.HORIZONTAL) {
            puml.push('left to right direction');
        }
        else {
            puml.push('top to bottom direction');
        }
        puml.push(this.generatePlantUMLSkinParams());
        return puml.join('\n');
    }
    generatePlantUMLSkinParams() {
        return `
skinparam monochrome true
skinparam shadowing false
skinparam nodesep 20
skinparam ranksep 20
skinparam defaultFontName Tahoma
skinparam defaultFontSize 12
skinparam roundCorner 4
skinparam dpi 150
skinparam arrowThickness 0.6
skinparam packageTitleAlignment left

' oval
skinparam usecase {
  borderThickness 0.6
}

' rectangle
skinparam rectangle {
  borderThickness 0.6
}

' component
skinparam component {
  borderThickness 1
}
`;
    }
    convert(pathOrType, puml) {
        const fullExportPath = path.resolve(this.config.directory, pathOrType);
        const ext = path.extname(fullExportPath);
        const shouldConvertAndSave = Object.values(types_1.OutputFormat).includes(ext.replace('.', ''));
        const shouldConvertAndOutput = Object.values(types_1.OutputFormat).includes(pathOrType);
        if (fs.existsSync(fullExportPath)) {
            utils_1.debug('Removing', fullExportPath);
            fs.unlinkSync(fullExportPath);
        }
        if (shouldConvertAndSave || shouldConvertAndOutput) {
            utils_1.debug('Converting', ext ? fullExportPath : pathOrType);
            return this.convertToImage(puml, ext || pathOrType).then(image => {
                if (shouldConvertAndSave) {
                    utils_1.debug('Saving', fullExportPath, image.length);
                    fs.writeFileSync(fullExportPath, image);
                }
                return image.toString();
            }).catch(err => {
                throw err;
            });
        }
        else {
            if (ext === '.puml') {
                utils_1.debug('Saving', fullExportPath);
                fs.writeFileSync(fullExportPath, puml);
            }
            return Promise.resolve(puml);
        }
    }
    convertToImage(puml, format) {
        return new Promise((resolve, reject) => {
            const path = format.match(/\w{3}/);
            if (!path) {
                return reject(new Error(`Cannot identify image format from ${format}`));
            }
            this.requestChain = this.requestChain.then(() => {
                return this.request(`/${path[0]}`, puml)
                    .then(result => resolve(result))
                    .catch(err => utils_1.debug(err));
            });
        });
    }
    request(path, payload) {
        return new Promise((resolve, reject) => {
            const req = https
                .request({
                path,
                hostname: 'arkit.herokuapp.com',
                port: 443,
                method: 'post',
                headers: {
                    'Content-Type': 'text/plain',
                    'Content-Length': payload.length
                }
            }, res => {
                const data = [];
                res.on('data', chunk => data.push(chunk));
                res.on('end', () => {
                    resolve(Buffer.concat(data));
                });
            })
                .on('error', err => {
                reject(err);
            });
            req.write(payload);
            req.end();
        });
    }
}
exports.Generator = Generator;
