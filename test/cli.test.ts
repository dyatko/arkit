import { execSync } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'

jest.setTimeout(60000)

describe('CLI', () => {
  const arkit = path.join(__dirname, '../index.js')

  describe('Options', () => {
    test('should output help', () => {
      expect(execSync(`${arkit} -h`).toString()).toMatchSnapshot()
    })
  })

  describe('Sample', () => {
    describe('no args', () => {
      const dir = path.join(__dirname, './sample')
      const pumlPath = path.join(dir, './docs/architecture.puml')
      const svgPath = path.join(dir, './docs/architecture.svg')

      beforeAll(() => {
        if (fs.existsSync(pumlPath)) fs.unlinkSync(pumlPath)
        if (fs.existsSync(svgPath)) fs.unlinkSync(svgPath)

        process.chdir(dir)
        execSync(arkit)
      })

      test('should generate correct puml', () => {
        expect(fs.readFileSync(pumlPath).toString()).toMatchSnapshot()
      })

      test('should generate correct svg', () => {
        expect(fs.readFileSync(svgPath).toString()).toMatchSnapshot()
      })
    })
  })

  describe('Angular2 Todo', () => {
    describe('no args', () => {
      test('should output correct svg', () => {
        const dir = path.join(__dirname, './angular2_es2015')

        process.chdir(dir)
        expect(execSync(arkit).toString()).toMatchSnapshot()
      })
    })
  })

  describe('Express', () => {
    describe('no args', () => {
      test('should output correct svg', () => {
        const dir = path.join(__dirname, './express')
        const svgPath = path.join(dir, './express.svg')

        if (fs.existsSync(svgPath)) fs.unlinkSync(svgPath)

        process.chdir(dir)
        execSync(arkit)

        expect(fs.readFileSync(svgPath).toString()).toMatchSnapshot()
      })
    })
  })

  describe('ReactDOM', () => {
    describe('no args', () => {
      test('should output correct svg', () => {
        const dir = path.join(__dirname, './react-dom')
        const svgPath = path.join(dir, './arkit.svg')

        if (fs.existsSync(svgPath)) fs.unlinkSync(svgPath)

        process.chdir(dir)
        execSync(arkit)

        expect(fs.readFileSync(svgPath).toString()).toMatchSnapshot()
      })
    })
  })
})
