import * as path from 'path'
import { OutputDirection, OutputSchema } from './schema'
import { debug, trace } from './logger'
import * as https from 'https'
import {
  Component,
  Context,
  EMPTY_LAYER,
  GeneratorBase,
  Layers
} from './generator.base'

export class Generator extends GeneratorBase {
  generatePlantUML (output: OutputSchema): string {
    debug('Generating components...')
    const components = this.sortComponentsByName(
      this.resolveConflictingComponentNames(this.generateComponents(output))
    )
    trace(Array.from(components.values()))

    debug('Generating layers...')
    const layers = this.generateLayers(output, components)
    trace(Array.from(layers.keys()))

    const puml = ['@startuml']

    puml.push(this.generatePlantUMLSkin(output, layers))

    for (const [layer, components] of layers.entries()) {
      puml.push(this.generatePlantUMLLayer(layer, components))
    }

    puml.push(this.generatePlantUMLRelationships(layers))
    puml.push('')
    puml.push('@enduml')

    return puml.join('\n')
  }

  private generatePlantUMLLayer (
    layer: string | Symbol,
    components: Set<Component>
  ): string {
    if (!components.size) return ''

    const puml = ['']
    const isLayer = layer !== EMPTY_LAYER

    if (isLayer) puml.push(`rectangle "${layer}" {`)

    for (const component of components) {
      const componentPuml = [
        this.generatePlantUMLComponent(component, Context.LAYER)
      ]

      if (isLayer) componentPuml.unshift('  ')
      puml.push(componentPuml.join(''))
    }

    if (isLayer) puml.push('}')

    return puml.join('\n')
  }

  private generatePlantUMLComponent (
    component: Component,
    context: Context
  ): string {
    const puml: string[] = []
    const hasLayer = component.layer !== EMPTY_LAYER
    const safeName = component.name.replace(/[./]/g, '_')

    if (hasLayer) {
      puml.push(`(${component.name})`)
    } else {
      if (context === Context.RELATIONSHIP) {
        puml.push(safeName)
      } else {
        puml.push('rectangle "')
        if (!component.isImported) puml.push('<b>')
        puml.push(component.name)
        if (!component.isImported) puml.push('</b>')
        puml.push(`" as ${safeName}`)
      }
    }

    return puml.join('')
  }

  private generatePlantUMLRelationships (layers: Layers): string {
    const puml = ['']
    const components = this.getAllComponents(layers, true)

    for (const component of components) {
      for (const importedFilename of component.imports) {
        const importedComponent = components.find(
          importedComponent => importedComponent.filename === importedFilename
        )

        if (importedComponent) {
          const connectionLength = this.getConnectionLength(component, importedComponent)
          const connectionSign = this.getConnectionSign(component, importedComponent)
          const connection = connectionSign.repeat(connectionLength) + '>'
          const relationshipUML = [
            this.generatePlantUMLComponent(component, Context.RELATIONSHIP),
            connection,
            this.generatePlantUMLComponent(importedComponent, Context.RELATIONSHIP)
          ]

          puml.push(relationshipUML.join(' '))
        }
      }
    }

    return puml.join('\n')
  }

  private getConnectionLength (component: Component, importedComponent: Component): number {
    const numberOfLevels = path
      .dirname(path.relative(component.filename, importedComponent.filename))
      .split(path.sep).length

    return Math.max(
      component.isImported ? 2 : 1,
      Math.min(4, numberOfLevels)
    )
  }

  private getConnectionSign (component: Component, importedComponent: Component): string {
    if (!component.isImported) return '='
    if (component.layer === importedComponent.layer && component.layer !== EMPTY_LAYER) return '.'
    return '-'
  }

  /**
   * https://github.com/plantuml/plantuml/blob/master/src/net/sourceforge/plantuml/SkinParam.java
   */
  private generatePlantUMLSkin (output: OutputSchema, layers: Layers): string {
    const puml = ['']

    puml.push('scale max 1920 width')

    const direction =
      output.direction || this.getAllComponents(layers).length > 20
        ? OutputDirection.HORIZONTAL
        : OutputDirection.VERTICAL

    if (direction === OutputDirection.HORIZONTAL) {
      puml.push('left to right direction')
    } else {
      puml.push('top to bottom direction')
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
    `)

    return puml.join('\n')
  }

  convertToSVG (puml: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = https
        .request(
          {
            hostname: 'arkit.herokuapp.com',
            port: 443,
            path: '/svg',
            method: 'post',
            headers: {
              'Content-Type': 'text/plain',
              'Content-Length': puml.length
            }
          },
          res => {
            let svg = ['']

            res.on('data', data => svg.push(data))
            res.on('end', () => resolve(svg.join('')))
          }
        )
        .on('error', reject)

      req.write(puml)
      req.end()
    })
  }
}
