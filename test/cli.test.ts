import { execSync } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'

jest.setTimeout(60000)

describe('CLI', () => {
  const arkit = path.resolve(__dirname, '../index.js')

  describe('Options', () => {
    test('should output help', () => {
      expect(execSync(`${arkit} -h`).toString()).toMatchSnapshot()
    })
  })

  describe('Arkit', () => {
    describe('png and first', () => {
      test('should generate correct png', () => {
        const dir = path.resolve(__dirname, './..')
        const pngPath = path.resolve(dir, './dist/arkit.png')

        if (fs.existsSync(pngPath)) fs.unlinkSync(pngPath)

        process.chdir(dir)
        execSync(`npm run architecture`)
        const stat = fs.statSync(pngPath)

        expect({
          blksize: stat.blksize,
          blocks: stat.blocks,
          size: stat.size
        }).toMatchSnapshot()
      })
    })
  })

  describe('Sample', () => {
    describe('no args', () => {
      const dir = path.resolve(__dirname, './sample')
      const pumlPath = path.resolve(dir, './docs/architecture.puml')
      const svgPath = path.resolve(dir, './docs/architecture.svg')

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
        const dir = path.resolve(__dirname, './angular2_es2015')

        process.chdir(dir)
        expect(execSync(arkit).toString()).toMatchSnapshot()
      })
    })

    describe('exclude and puml', () => {
      test('should output correct puml', () => {
        const dir = path.resolve(__dirname, './angular2_es2015')

        process.chdir(dir)
        expect(execSync(`${arkit} -o puml -e "app/components/**"`).toString()).toMatchSnapshot()
      })
    })
  })

  describe('Express', () => {
    describe('no args', () => {
      test('should output correct svg', () => {
        const dir = path.resolve(__dirname, './express')
        const svgPath = path.resolve(dir, './express.svg')

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
        const dir = path.resolve(__dirname, './react-dom')
        const svgPath = path.resolve(dir, './arkit.svg')

        if (fs.existsSync(svgPath)) fs.unlinkSync(svgPath)

        process.chdir(dir)
        execSync(arkit)

        expect(fs.readFileSync(svgPath).toString()).toMatchSnapshot()
      })
    })
  })
})
