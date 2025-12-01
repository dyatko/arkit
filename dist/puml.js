"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUML = void 0;
const schema_1 = require("./schema");
const types_1 = require("./types");
const utils_1 = require("./utils");
const path = __importStar(require("path"));
class PUML {
    constructor() {
        this.staticSkinParams = `skinparam monochrome true
skinparam shadowing false
skinparam defaultFontName Tahoma
skinparam defaultFontSize 12
skinparam roundCorner 6
skinparam dpi 150
skinparam arrowColor black
skinparam arrowThickness 0.5
skinparam packageTitleAlignment left

' oval
skinparam usecase {
  borderThickness 0.5
}

' rectangle
skinparam rectangle {
  borderThickness 0.5
}

' component
skinparam component {
  borderThickness 1
}`;
    }
    from(output, layers) {
        const layerComponents = (0, utils_1.getAllComponents)(layers, true);
        (0, utils_1.trace)(Array.from(layers.keys()));
        const puml = ["@startuml"];
        puml.push(this.generatePlantUMLSkin(output, layerComponents));
        for (const [layer, components] of layers.entries()) {
            puml.push(this.generatePlantUMLLayer(layer, components));
        }
        puml.push(this.generatePlantUMLRelationships(layerComponents));
        puml.push("\n@enduml");
        puml.push("\n' View and edit on https://arkit.pro");
        return puml.join("\n");
    }
    generatePlantUMLLayer(layer, components) {
        if (!components.size)
            return "";
        const puml = [""];
        const isLayer = layer !== types_1.EMPTY_LAYER;
        if (isLayer)
            puml.push(`package "${layer}" {`);
        for (const component of components) {
            const componentPuml = [
                this.generatePlantUMLComponent(component, types_1.Context.LAYER),
            ];
            if (isLayer)
                componentPuml.unshift("  ");
            puml.push(componentPuml.join(""));
        }
        if (isLayer)
            puml.push("}");
        return puml.join("\n");
    }
    generatePlantUMLComponent(component, context) {
        const puml = [];
        const isDirectory = component.filename.endsWith("**");
        const hasLayer = component.layer !== types_1.EMPTY_LAYER;
        let name = component.name.replace(/\\/g, "/");
        const safeName = "_" + name.replace(/[^\w]/g, "_");
        if ((isDirectory && !hasLayer) || (!isDirectory && !component.isImported)) {
            name = (0, utils_1.bold)(name);
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
        return puml.join("");
    }
    generatePlantUMLRelationships(components) {
        const puml = [""];
        for (const component of components) {
            for (const importedFilename of component.imports) {
                const importedComponent = components.find((importedComponent) => importedComponent.filename === importedFilename);
                if (importedComponent) {
                    puml.push(this.generatePlantUMLRelationship(component, importedComponent));
                }
            }
        }
        return puml.join("\n");
    }
    generatePlantUMLRelationship(component, importedComponent) {
        const connectionLength = this.getConnectionLength(component, importedComponent);
        const connectionSign = this.getConnectionSign(component, importedComponent);
        const connectionStyle = this.getConnectionStyle(component);
        const connection = connectionSign.repeat(connectionLength) + connectionStyle + ">";
        const puml = [
            this.generatePlantUMLComponent(component, types_1.Context.RELATIONSHIP),
            connection,
            this.generatePlantUMLComponent(importedComponent, types_1.Context.RELATIONSHIP),
        ];
        return puml.join(" ");
    }
    getConnectionLength(component, importedComponent) {
        const numberOfLevels = path
            .dirname(path.relative(component.filename, importedComponent.filename))
            .split(path.sep).length;
        return Math.max(component.isImported ? 2 : 1, Math.min(4, numberOfLevels - 1));
    }
    getConnectionSign(component, importedComponent) {
        const isVagueConnection = component.layer === importedComponent.layer &&
            component.layer !== types_1.EMPTY_LAYER;
        return isVagueConnection ? "." : "-";
    }
    getConnectionStyle(component) {
        if (!component.isImported)
            return "[thickness=1]";
        return "";
    }
    /**
     * https://github.com/plantuml/plantuml/blob/master/src/net/sourceforge/plantuml/SkinParam.java
     */
    generatePlantUMLSkin(output, components) {
        const puml = [""];
        puml.push("scale max 1920 width");
        const direction = output.direction ||
            (components.length > 20
                ? schema_1.OutputDirection.HORIZONTAL
                : schema_1.OutputDirection.VERTICAL);
        if (direction === schema_1.OutputDirection.HORIZONTAL) {
            puml.push("left to right direction");
        }
        else {
            puml.push("top to bottom direction");
        }
        puml.push(this.generatePlantUMLSkinParams(components));
        return puml.join("\n");
    }
    generatePlantUMLSkinParams(components) {
        const complexity = Math.min(1, components.length / 60);
        const nodesep = 10 + Math.round(complexity * 15);
        const ranksep = 20 + Math.round(complexity * 30);
        return `
skinparam nodesep ${nodesep}
skinparam ranksep ${ranksep}
${this.staticSkinParams}
`;
    }
}
exports.PUML = PUML;
