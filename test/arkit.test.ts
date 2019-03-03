import * as path from 'path'
import { arkit } from '../src/arkit'

jest.setTimeout(60000)

describe('Arkit', () => {
  test('itself', () => {
    const directory = path.resolve(__dirname, '..')

    return arkit({
      directory,
      output: ['puml'],
      exclude: ['node_modules', 'test', 'dist', 'coverage']
    }).then(output => {
      expect(output).toMatchSnapshot()
    })
  })

  test('Sample', () => {
    const directory = path.resolve(__dirname, './sample')

    return arkit({directory}).then(output => {
      expect(output).toMatchSnapshot()
    })
  })

  test('Angular2 Todo', () => {
    const directory = path.resolve(__dirname, './angular2_es2015')

    return arkit({directory}).then(output => {
      expect(output).toMatchSnapshot()
    })
  })

  test('Express', () => {
    const directory = path.resolve(__dirname, './express')

    return arkit({directory}).then(output => {
      expect(output).toMatchSnapshot()
    })
  })
})
