import * as path from 'path'
import { arkit } from '../src/arkit'

describe('Arkit', () => {
  test('Sample', () => {
    const dir = path.join(__dirname, './sample')

    expect(arkit(dir)).toMatchSnapshot()
  })

  test('Angular2 Todo', () => {
    const dir = path.join(__dirname, './angular2_es2015')

    expect(arkit(dir)).toMatchSnapshot()
  })

  test('Express', () => {
    const dir = path.join(__dirname, './express')

    expect(arkit(dir)).toMatchSnapshot()
  })
})
