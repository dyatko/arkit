import * as path from 'path'
import { arkit } from '../src/arkit'

describe('Arkit', () => {
  test('Sample', () => {
    const dir = path.join(__dirname, './sample')

    arkit(dir).then(output => {
      expect(output).toMatchSnapshot()
    })
  })

  test('Angular2 Todo', () => {
    const dir = path.join(__dirname, './angular2_es2015')

    arkit(dir).then(output => {
      expect(output).toMatchSnapshot()
    })
  })

  test('Express', () => {
    const dir = path.join(__dirname, './express')

    arkit(dir).then(output => {
      expect(output).toMatchSnapshot()
    })
  })
})
