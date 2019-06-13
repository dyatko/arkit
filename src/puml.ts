import { OutputDirection, OutputSchema } from "./schema";
import { Component, Context, EMPTY_LAYER, Layers } from "./types";
import { bold, getAllComponents, trace } from "./utils";
import * as path from "path";

export class PUML {
  from(output: OutputSchema, layers: Layers): string {
    const layerComponents = getAllComponents(layers, true);
    trace(Array.from(layers.keys()));

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

  private generatePlantUMLLayer(
    layer: string | Symbol,
    components: Set<Component>
  ): string {
    if (!components.size) return "";

    const puml = [""];
    const isLayer = layer !== EMPTY_LAYER;

    if (isLayer) puml.push(`package "${layer}" {`);

    for (const component of components) {
      const componentPuml = [
        this.generatePlantUMLComponent(component, Context.LAYER)
      ];

      if (isLayer) componentPuml.unshift("  ");
      puml.push(componentPuml.join(""));
    }

    if (isLayer) puml.push("}");

    return puml.join("\n");
  }

  private generatePlantUMLComponent(
    component: Component,
    context: Context
  ): string {
    const puml: string[] = [];
    const isDirectory = component.filename.endsWith("**");
    const hasLayer = component.layer !== EMPTY_LAYER;
    let name = component.name.replace(/\\/g, "/");
    const safeName = "_" + name.replace(/[^\w]/g, "_");

    if ((isDirectory && !hasLayer) || (!isDirectory && !component.isImported)) {
      name = bold(name);
    }

    if (isDirectory) {
      if (hasLayer) {
        puml.push(`[${name}]`);
      } else if (context === Context.RELATIONSHIP) {
        puml.push(safeName);
      } else {
        puml.push(`[${name}] as ${safeName}`);
      }
    } else if (!component.isClass) {
      puml.push(`(${name})`);
    } else if (context === Context.RELATIONSHIP) {
      puml.push(safeName);
    } else {
      puml.push(`rectangle "${name}" as ${safeName}`);
    }

    return puml.join("");
  }

  private generatePlantUMLRelationships(components: Component[]): string {
    const puml = [""];

    for (const component of components) {
      for (const importedFilename of component.imports) {
        const importedComponent = components.find(
          importedComponent => importedComponent.filename === importedFilename
        );

        if (importedComponent) {
          puml.push(
            this.generatePlantUMLRelationship(component, importedComponent)
          );
        }
      }
    }

    return puml.join("\n");
  }

  private generatePlantUMLRelationship(
    component: Component,
    importedComponent: Component
  ): string {
    const connectionLength = this.getConnectionLength(
      component,
      importedComponent
    );
    const connectionSign = this.getConnectionSign(component, importedComponent);
    const connectionStyle = this.getConnectionStyle(component);
    const connection =
      connectionSign.repeat(connectionLength) + connectionStyle + ">";
    const puml = [
      this.generatePlantUMLComponent(component, Context.RELATIONSHIP),
      connection,
      this.generatePlantUMLComponent(importedComponent, Context.RELATIONSHIP)
    ];

    return puml.join(" ");
  }

  private getConnectionLength(
    component: Component,
    importedComponent: Component
  ): number {
    const numberOfLevels = path
      .dirname(path.relative(component.filename, importedComponent.filename))
      .split(path.sep).length;

    return Math.max(
      component.isImported ? 2 : 1,
      Math.min(4, numberOfLevels - 1)
    );
  }

  private getConnectionSign(
    component: Component,
    importedComponent: Component
  ): string {
    const isVagueConnection =
      component.layer === importedComponent.layer &&
      component.layer !== EMPTY_LAYER;

    return isVagueConnection ? "." : "-";
  }

  private getConnectionStyle(component: Component): string {
    if (!component.isImported) return "[thickness=1]";
    return "";
  }

  /**
   * https://github.com/plantuml/plantuml/blob/master/src/net/sourceforge/plantuml/SkinParam.java
   */
  private generatePlantUMLSkin(
    output: OutputSchema,
    components: Component[]
  ): string {
    const puml = [""];

    puml.push("scale max 1920 width");

    const direction =
      output.direction ||
      (components.length > 20
        ? OutputDirection.HORIZONTAL
        : OutputDirection.VERTICAL);

    if (direction === OutputDirection.HORIZONTAL) {
      puml.push("left to right direction");
    } else {
      puml.push("top to bottom direction");
    }

    puml.push(this.generatePlantUMLSkinParams(components));

    return puml.join("\n");
  }

  private readonly staticSkinParams = `skinparam monochrome true
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

  private generatePlantUMLSkinParams(components: Component[]): string {
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
