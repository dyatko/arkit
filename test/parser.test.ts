import * as path from 'path'
import { Config } from '../src/config'
import { Parser } from '../src/parser'

describe('Parser', () => {
  test('Sample', () => {
    const dir = path.join(__dirname, './sample')
    const config = new Config(dir)
    const parser = new Parser(config)

    expect(parser.parse()).toMatchSnapshot()
  })

  test('Angular2 Todo', () => {
    const dir = path.join(__dirname, './angular2_es2015')
    const parser = new Parser(new Config(dir))

    expect(parser.parse()).toMatchSnapshot()
  })

  test('Express', () => {
    const dir = path.join(__dirname, './express')
    const parser = new Parser(new Config(dir))

    expect(parser.parse()).toMatchSnapshot()
  })
})
