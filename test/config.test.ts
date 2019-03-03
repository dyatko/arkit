import * as path from 'path'
import { Config } from '../src/config'

describe('Config', () => {
  test('Sample', () => {
    const directory = path.resolve(__dirname, './sample')
    const config = new Config({directory})

    expect(config.directory).toBe(directory)
    delete config.directory
    expect(config).toMatchSnapshot()
  })

  test('Angular2 Todo', () => {
    const directory = path.resolve(__dirname, './angular2_es2015')
    const config = new Config({directory})

    expect(config.directory).toBe(directory)
    delete config.directory
    expect(config).toMatchSnapshot()
  })

  test('Express', () => {
    const directory = path.resolve(__dirname, './express')
    const config = new Config({directory})

    expect(config.directory).toBe(directory)
    delete config.directory
    expect(config).toMatchSnapshot()
  })
})
