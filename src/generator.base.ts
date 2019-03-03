import { Config } from './config'
import { ComponentFilters, ComponentNameFormat, ComponentSchema, OutputSchema } from './schema'
import { trace } from './logger'
import * as path from 'path'
import { Files } from './parser'
import * as nanomatch from 'nanomatch'

export const EMPTY_LAYER = Symbol('__empty_layer__')

export interface Component {
  name: string
  type: string
  filename: string
  imports: string[]
  layer: string | typeof EMPTY_LAYER
  isImported: boolean
  first?: boolean
  last?: boolean
}

export interface Components extends Map<string, Component> {
}

export interface Layers extends Map<string | typeof EMPTY_LAYER, Set<Component>> {
}

export enum Context {
  LAYER,
  RELATIONSHIP
}

export class GeneratorBase {
  protected config: Config
  private files: Files

  constructor (
    config: Config,
    files: Files
  ) {
    this.config = config
    this.files = files
  }

  protected generateComponents (output: OutputSchema): Components {
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

  protected generateLayers (output: OutputSchema, allComponents: Components): Layers {
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

  protected resolveConflictingComponentNames (components: Components): Components {
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

  protected sortComponentsByName (components: Components): Components {
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

  protected findComponentSchema (output: OutputSchema, filename: string): ComponentSchema {
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

  protected verifyComponentFilters (filters: ComponentFilters, component: Component | ComponentSchema): boolean {
    const matchesPatterns = !('filename' in component) || !filters.patterns || nanomatch.some(component.filename, filters.patterns)
    const matchesComponents = !filters.components || filters.components.some(type => type === component.type)
    return matchesPatterns && matchesComponents
  }

  protected getComponentName (filename: string, componentConfig: ComponentSchema): string {
    const nameFormat = componentConfig.format

    if (nameFormat === ComponentNameFormat.FULL_NAME) {
      return path.basename(filename)
    }

    return path.basename(filename, path.extname(filename))
  }

  protected getAllComponents (layers: Layers, sortByName = false): Component[] {
    const components = ([] as Component[]).concat(...[...layers.values()].map(components => [...components]))

    if (sortByName) {
      components.sort((a, b) => a.name.localeCompare(b.name))
    }

    return components
  }
}
