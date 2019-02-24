import * as path from 'path'
import { arkit } from '../src/arkit'

describe('Arkit', () => {
  test('Sample', () => {
    const dir = path.join(__dirname, './sample')

    return arkit(dir).then(output => {
      expect(output).toMatchSnapshot()
    })
  })

  test('Angular2 Todo', () => {
    const dir = path.join(__dirname, './angular2_es2015')

    return arkit(dir).then(output => {
      expect(output).toMatchSnapshot()
    })
  })

  test('Express', () => {
    const dir = path.join(__dirname, './express')

    return arkit(dir).then(output => {
      expect(output).toMatchSnapshot()
    })
  })
})
