import { Files } from './parser'
import * as path from 'path'
import * as https from 'https'
import * as nanomatch from 'nanomatch'
import { ComponentFilters, ComponentNameFormat, ComponentSchema, Config, OutputDirection, OutputSchema } from './config'
import { debug, trace } from './logger'

interface Component {
  name: string
  type: string
  filename: string
  imports: string[]
  layer: string | typeof EMPTY_LAYER
  isImported: boolean
  first?: boolean
  last?: boolean
}

interface Components extends Map<string, Component> {
}

interface Layers extends Map<string | typeof EMPTY_LAYER, Set<Component>> {
}

enum Context {
  LAYER,
  RELATIONSHIP
}

const EMPTY_LAYER = Symbol('__empty_layer__')

export class Generator {
  constructor (
    private config: Config,
    private files: Files
  ) {
  }

  private generateComponents (output: OutputSchema): Components {
    const components = Object.keys(this.files).reduce((components, filename) => {
      const schema = this.findComponentSchema(output, filename)

      if (schema) {
        const name = this.getComponentName(filename, schema)

        components.set(filename, {
          name,
          filename,
          isImported: false,
          type: schema.type,
          layer: EMPTY_LAYER,
          imports: Object.keys(this.files[filename].imports)
        })
      }

      return components
    }, new Map() as Components)

    for (const component of components.values()) {
      for (const potentialComponent of components.values()) {
        if (potentialComponent.imports.includes(component.filename)) {
          component.isImported = true
          break
        }
      }
    }

    return components
  }

  private generateLayers (output: OutputSchema, allComponents: Components): Layers {
    const groups = this.config.array(output.groups) || [{}]
    const ungroupedComponents: Components = new Map(allComponents)
    const grouppedComponents = new Map<string, Component>()
    const layers: Layers = new Map()

    groups.forEach(group => {
      const layerType = group.type || EMPTY_LAYER

      if (!layers.has(layerType)) {
        layers.set(layerType, new Set())
      }

      Array.from(ungroupedComponents.entries())
        .filter(([filename, component]) => {
          return this.verifyComponentFilters(group, component)
        })
        .forEach(([filename, component]) => {
          component.layer = layerType
          component.first = group.first
          component.last = group.last
          layers.get(layerType)!.add(component)
          grouppedComponents.set(component.filename, component)
          ungroupedComponents.delete(filename)
          return component
        })
    })

    if (ungroupedComponents.size) {
      trace('Ungrouped components')
      trace(Array.from(ungroupedComponents.values()))
    }

    const filenamesFromFirstComponents = new Set<string>()

    for (const component of grouppedComponents.values()) {
      if (component.first) {
        this.collectImportedFilenames(component, grouppedComponents, filenamesFromFirstComponents)
      }
    }

    if (filenamesFromFirstComponents.size) {
      trace('Filenames from first components')
      trace(Array.from(filenamesFromFirstComponents))

      for (const [filename, component] of allComponents) {
        if (!filenamesFromFirstComponents.has(filename)) {
          for (const components of layers.values()) {
            components.delete(component)
          }

          ungroupedComponents.delete(filename)
          allComponents.delete(filename)
        }
      }
    }

    if (ungroupedComponents.size) {
      trace('Ungrouped components leftovers')
      trace(Array.from(ungroupedComponents.values()))
    }

    return layers
  }

  private collectImportedFilenames (component: Component, components: Components, filenames: Set<string>) {
    if (filenames.has(component.filename)) return

    filenames.add(component.filename)

    if (!component.last) {
      component.imports.forEach(importedFilename => {
        const importedComponent = components.get(importedFilename)
        if (importedComponent) {
          this.collectImportedFilenames(importedComponent, components, filenames)
        }
      })
    } else {
      component.imports = []
    }
  }

  private resolveConflictingComponentNames (components: Components): Components {
    const componentsByName: { [name: string]: Component[] } = {}

    for (const component of components.values()) {
      componentsByName[component.name] = componentsByName[component.name] || []
      componentsByName[component.name].push(component)
    }

    for (const name in componentsByName) {
      const components = componentsByName[name]
      const differentFilenames = new Set(
        components.map(component => component.filename)
      )
      const shouldPrefixWithDirectory = differentFilenames.size > 1 || name === 'index'

      if (shouldPrefixWithDirectory) {
        for (const component of components) {
          const dir = path.basename(path.dirname(component.filename))
          component.name = path.join(dir, component.name)
        }
      }
    }

    return components
  }

  private sortComponentsByName (components: Components): Components {
    const sortedComponents: Components = new Map(Array.from(components.entries()).sort(
      (a, b) => a[1].name.localeCompare(b[1].name)
    ))

    for (const component of components.values()) {
      component.imports = component.imports
        .filter(importedFilename => components.has(importedFilename))
        .sort((a, b) => {
          const componentA = components.get(a)!
          const componentB = components.get(b)!
          return componentA.name.localeCompare(componentB.name)
        })
    }

    return sortedComponents
  }

  private findComponentSchema (output: OutputSchema, filename: string): ComponentSchema {
    const componentSchema = this.config.components.find(componentSchema => {
      const outputFilters: ComponentFilters[] = [output, ...this.config.array(output.groups) || []]
      const includedInOutput = outputFilters.some(
        outputFilter => this.verifyComponentFilters(outputFilter, componentSchema)
      )

      if (includedInOutput) {
        return !!componentSchema.patterns && nanomatch.some(filename, componentSchema.patterns)
      } else {
        return false
      }
    })

    if (!componentSchema) {
      throw new Error(`Component schema not found: ${filename}`)
    }

    return componentSchema
  }

  private verifyComponentFilters (filters: ComponentFilters, component: Component | ComponentSchema): boolean {
    const matchesPatterns = !('filename' in component) || !filters.patterns || nanomatch.some(component.filename, filters.patterns)
    const matchesComponents = !filters.components || filters.components.some(type => type === component.type)
    return matchesPatterns && matchesComponents
  }

  private getComponentName (filename: string, componentConfig: ComponentSchema): string {
    const nameFormat = componentConfig.format

    if (nameFormat === ComponentNameFormat.FULL_NAME) {
      return path.basename(filename)
    }

    return path.basename(filename, path.extname(filename))
  }

  private match (filename: string, pattern: string): boolean {
    return nanomatch(filename, pattern)
  }

  generatePlantUML (output: OutputSchema): string {
    debug('Generating components...')
    const components = this.sortComponentsByName(
      this.resolveConflictingComponentNames(
        this.generateComponents(output)
      )
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

  convertToSVG (puml: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'arkit.herokuapp.com',
        port: 443,
        path: '/svg',
        method: 'post',
        headers: {
          'Content-Type': 'text/plain',
          'Content-Length': puml.length
        }
      }, res => {
        let svg = ['']

        res.on('data', data => svg.push(data))
        res.on('end', () => resolve(svg.join('')))
      }).on('error', reject)

      req.write(puml)
      req.end()
    })
  }

  private generatePlantUMLLayer (layer: string | Symbol, components: Set<Component>): string {
    if (!components.size) return ''

    const puml = ['']
    const isLayer = typeof layer === 'string'

    if (isLayer) puml.push(`rectangle "${layer}" {`)

    for (const component of components) {
      const componentPuml = [this.generatePlantUMLComponent(component, Context.LAYER)]

      if (isLayer) componentPuml.unshift('  ')
      puml.push(componentPuml.join(''))
    }

    if (isLayer) puml.push('}')

    return puml.join('\n')
  }

  private generatePlantUMLComponent (component: Component, context: Context): string {
    const puml: string[] = []
    const hasLayer = typeof component.layer === 'string'
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
    const components = this.getAllComponents(layers)
      .sort((a, b) => a.name.localeCompare(b.name))

    for (const component of components) {
      for (const importedFilename of component.imports) {
        const importedComponent = components.find(importedComponent => importedComponent.filename === importedFilename)
        if (!importedComponent) continue

        const numberOfLevels = path.dirname(path.relative(component.filename, importedFilename)).split(path.sep).length
        const connectionLength = Math.max(component.isImported ? 2 : 1, Math.min(4, numberOfLevels))
        const connectionSign = !component.isImported ? '=' : component.layer === importedComponent.layer && typeof component.layer === 'string' ? '.' : '-'
        const connection = connectionSign.repeat(connectionLength) + '>'

        puml.push([
          this.generatePlantUMLComponent(component, Context.RELATIONSHIP),
          connection,
          this.generatePlantUMLComponent(importedComponent, Context.RELATIONSHIP)
        ].join(' '))
      }
    }

    return puml.join('\n')
  }

  /**
   * https://github.com/plantuml/plantuml/blob/master/src/net/sourceforge/plantuml/SkinParam.java
   */
  private generatePlantUMLSkin (output: OutputSchema, layers: Layers): string {
    const puml = ['']

    puml.push('scale max 1920 width')

    const direction = output.direction || this.getAllComponents(layers).length > 20 ? OutputDirection.HORIZONTAL : OutputDirection.VERTICAL

    if (direction === OutputDirection.HORIZONTAL) {
      puml.push('left to right direction')
    } else {
      puml.push('top to bottom direction')
    }

    puml.push('skinparam monochrome true')
    puml.push('skinparam shadowing false')
    puml.push('skinparam nodesep 20')
    puml.push('skinparam defaultFontName Tahoma')
    puml.push('skinparam defaultFontSize 14')

    puml.push(`
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

  private getAllComponents (layers: Layers): Component[] {
    return ([] as Component[])
      .concat(...[...layers.values()].map(components => [...components]))
  }
}
