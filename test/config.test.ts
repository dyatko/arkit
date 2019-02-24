import * as path from 'path'
import { Config } from '../src/config'

describe('Config', () => {
  test('Sample', () => {
    const dir = path.join(__dirname, './sample')
    const config = new Config(dir)

    expect(config.directory).toBe(dir)
    delete config.directory
    expect(config).toMatchSnapshot()
  })

  test('Angular2 Todo', () => {
    const dir = path.join(__dirname, './angular2_es2015')
    const config = new Config(dir)

    expect(config.directory).toBe(dir)
    delete config.directory
    expect(config).toMatchSnapshot()
  })

  test('Express', () => {
    const dir = path.join(__dirname, './express')
    const config = new Config(dir)

    expect(config.directory).toBe(dir)
    delete config.directory
    expect(config).toMatchSnapshot()
  })
})
