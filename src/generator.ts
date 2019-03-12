import * as path from 'path'
import * as fs from 'fs'
import * as https from 'https'
import { array, bold, debug, info, trace } from './utils'
import { GeneratorBase } from './generator.base'
import { Component, Context, EMPTY_LAYER, Layers, OutputDirection, OutputFormat, OutputSchema } from './types'
import * as ProgressBar from 'progress'

export class Generator extends GeneratorBase {
  private progress: ProgressBar

  generate (): Promise<string[]> {
    const outputs = this.config.final.output as OutputSchema[]
    const total = outputs.reduce((total, output) => total + array(output.path)!.length, outputs.length)

    this.progress = new ProgressBar('Generating :bar', {
      total,
      clear: true,
      width: process.stdout.columns
    })

    return Promise.all(outputs.reduce((promises, output) => {
      let puml = this.generatePlantUML(output)
      this.progress.tick()

      puml = `${puml}

' View and edit on https://arkit.herokuapp.com`

      if (output.path && output.path.length) {
        for (const outputPath of array(output.path)!) {
          const promise = this.convert(outputPath, puml).then(value => {
            this.progress.tick()
            return value
          })

          promises.push(promise)
        }
      }

      return promises
    }, [] as Promise<string>[]))
  }

  private generatePlantUML (output: OutputSchema): string {
    info('Generating components...')
    const components = this.sortComponentsByName(
      this.resolveConflictingComponentNames(this.generateComponents(output))
    )
    trace(Array.from(components.values()))

    info('Generating layers...')
    const layers = this.generateLayers(output, components)
    const layerComponents = this.getAllComponents(layers, true)
    trace(Array.from(layers.keys()))

    const puml = ['@startuml']

    puml.push(this.generatePlantUMLSkin(output, layers))

    for (const [layer, components] of layers.entries()) {
      puml.push(this.generatePlantUMLLayer(layer, components))
    }

    puml.push(this.generatePlantUMLRelationships(layerComponents))
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

    if (isLayer) puml.push(`package "${layer}" {`)

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
    const isDirectory = component.filename.endsWith('**')
    const hasLayer = component.layer !== EMPTY_LAYER
    let name = component.name
    const safeName = '_' + name.replace(/[^\w]/g, '_')

    if ((isDirectory && !hasLayer) || (!isDirectory && !component.isImported)) {
      name = bold(name)
    }

    if (isDirectory) {
      if (hasLayer) {
        puml.push(`[${name}]`)
      } else if (context === Context.RELATIONSHIP) {
        puml.push(safeName)
      } else {
        puml.push(`[${name}] as ${safeName}`)
      }
    } else if (!component.isClass) {
      puml.push(`(${name})`)
    } else if (context === Context.RELATIONSHIP) {
      puml.push(safeName)
    } else {
      puml.push(`rectangle "${name}" as ${safeName}`)
    }

    return puml.join('')
  }

  private generatePlantUMLRelationships (components: Component[]): string {
    const puml = ['']

    for (const component of components) {
      for (const importedFilename of component.imports) {
        const importedComponent = components.find(
          importedComponent => importedComponent.filename === importedFilename
        )

        if (importedComponent) {
          const connectionLength = this.getConnectionLength(component, importedComponent)
          const connectionSign = this.getConnectionSign(component, importedComponent)
          const connectionStyle = this.getConnectionStyle(component)
          const connection = connectionSign.repeat(connectionLength) + connectionStyle + '>'
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
      Math.min(4, numberOfLevels - 1)
    )
  }

  private getConnectionSign (component: Component, importedComponent: Component): string {
    if (component.layer === importedComponent.layer && component.layer !== EMPTY_LAYER) return '~'
    return '-'
  }

  private getConnectionStyle (component: Component): string {
    if (!component.isImported) return '[thickness=1]'
    return ''
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

    puml.push(this.generatePlantUMLSkinParams())

    return puml.join('\n')
  }

  private generatePlantUMLSkinParams (): string {
    return `
skinparam monochrome true
skinparam shadowing false
skinparam nodesep 20
skinparam ranksep 60
skinparam defaultFontName Tahoma
skinparam defaultFontSize 12
skinparam roundCorner 4
skinparam dpi 150
skinparam arrowColor black
skinparam arrowThickness 0.55
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
}
`
  }

  private convert (pathOrType: string, puml: string): Promise<string> {
    const fullExportPath = path.resolve(this.config.directory, pathOrType)
    const ext = path.extname(fullExportPath)
    const shouldConvertAndSave = Object.values(OutputFormat).includes(ext.replace('.', ''))
    const shouldConvertAndOutput = Object.values(OutputFormat).includes(pathOrType)

    if (fs.existsSync(fullExportPath)) {
      debug('Removing', fullExportPath)
      fs.unlinkSync(fullExportPath)
    }

    if (shouldConvertAndSave || shouldConvertAndOutput) {
      debug('Converting', ext ? fullExportPath : pathOrType)
      return this.convertToImage(puml, ext || pathOrType).then(image => {
        if (shouldConvertAndSave) {
          debug('Saving', fullExportPath, image.length)
          fs.writeFileSync(fullExportPath, image)
        }

        return image.toString()
      }).catch(err => {
        throw err
      })
    } else {
      if (ext === '.puml') {
        debug('Saving', fullExportPath)
        fs.writeFileSync(fullExportPath, puml)
      }

      return Promise.resolve(puml)
    }
  }

  requestChain: Promise<any> = Promise.resolve()

  convertToImage (puml: string, format: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const path = format.match(/\w{3}/)

      if (!path) {
        return reject(new Error(`Cannot identify image format from ${format}`))
      }

      this.requestChain = this.requestChain.then(() => {
        return this.request(`/${path[0]}`, puml)
          .then(result => resolve(result))
          .catch(err => debug(err))
      })
    })
  }

  private request (path, payload): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const req = https
        .request(
          {
            path,
            hostname: 'arkit.herokuapp.com',
            port: 443,
            method: 'post',
            headers: {
              'Content-Type': 'text/plain',
              'Content-Length': payload.length
            }
          },
          res => {
            const data: Buffer[] = []

            res.on('data', chunk => data.push(chunk))
            res.on('end', () => {
              resolve(Buffer.concat(data))
            })
          }
        )
        .on('error', err => {
          reject(err)
        })

      req.write(payload)
      req.end()
    })
  }
}
