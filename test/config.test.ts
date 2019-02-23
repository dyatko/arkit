import * as path from 'path'
import { Config } from '../src/config'

describe('Config', () => {
  test('Sample', () => {
    const dir = path.join(__dirname, './sample')

    expect(new Config(dir)).toMatchSnapshot()
  })

  test('Angular2 Todo', () => {
    const dir = path.join(__dirname, './angular2_es2015')

    expect(new Config(dir)).toMatchSnapshot()
  })

  test('Express', () => {
    const dir = path.join(__dirname, './express')

    expect(new Config(dir)).toMatchSnapshot()
  })
})
