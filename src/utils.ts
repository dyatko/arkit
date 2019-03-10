import * as path from 'path'
import * as fs from 'fs'
import { trace } from './logger'
import { ComponentFilters, ComponentSchema } from './schema'
import * as nanomatch from 'nanomatch'
import { Component } from './types'

export const getPaths = (
  mainDirectory: string,
  directory: string,
  includePatterns: string[],
  excludePatterns: string[]
): string[] => {
  const root = path.join(mainDirectory, directory)

  return fs.readdirSync(root).reduce((suitablePaths, fileName) => {
    const filePath = path.join(directory, fileName)
    const notExcluded = !excludePatterns.length || !match(filePath, excludePatterns)

    if (notExcluded) {
      const fullPath = path.join(root, fileName)
      const stats = fs.statSync(fullPath)
      const isIncluded = match(filePath, includePatterns)

      if (stats.isDirectory()) {
        if (isIncluded) {
          suitablePaths.push(path.join(fullPath, '**'))
        } else {
          const childPaths = getPaths(mainDirectory, filePath, includePatterns, excludePatterns)
          suitablePaths.push(...childPaths)
        }
      } else if (stats.isFile() && isIncluded) {
        suitablePaths.push(fullPath)
      }
    }

    return suitablePaths
  }, [] as string[])
}

export const match = (filepath: string, patterns?: string[]): boolean => {
  return !patterns || !patterns.length || nanomatch.some(filepath, patterns)
}

export const find = (filepath: string, patterns: string[]): string | undefined => {
  return patterns.find(
    pattern => nanomatch(filepath, pattern).length
  )
}

export const safeRequire = <T> (path: string): T | undefined => {
  try {
    return require(path)
  } catch (e) {
    trace(e.toString())
  }
}

export const array = <T> (input?: T | T[]): T[] | undefined => {
  if (input) {
    return ([] as T[]).concat(input)
  }
}

export const verifyComponentFilters = (
  filters: ComponentFilters,
  component: Component | ComponentSchema,
  mainDirectory: string
): boolean => {
  const matchesPatterns = !('filename' in component) ||
    match(path.relative(mainDirectory, component.filename), filters.patterns)

  const matchesComponents =
    !filters.components ||
    filters.components.some(type => type === component.type)

  return matchesPatterns && matchesComponents
}
