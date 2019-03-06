<img src="https://arkit.js.org/arkit.svg" alt="arkit" valign="top" /> `🇸🇪arkitektur`

## Visualises JavaScript, TypeScript and Flow codebases as meaningful and committable architecture diagrams

[![npm](https://img.shields.io/npm/v/arkit.svg?label=%20&style=flat-square)](https://www.npmjs.com/package/arkit)
[![npm](https://img.shields.io/npm/dw/arkit.svg?style=flat-square)](https://www.npmjs.com/package/arkit)
[![Travis](https://img.shields.io/travis/dyatko/arkit.svg?style=flat-square)](https://travis-ci.org/dyatko/arkit)
[![Test coverage](https://img.shields.io/codeclimate/coverage/dyatko/arkit.svg?style=flat-square)](https://codeclimate.com/github/dyatko/arkit/code)
[![Technical debt](https://img.shields.io/codeclimate/tech-debt/dyatko/arkit.svg?style=flat-square)](https://codeclimate.com/github/dyatko/arkit/issues)
![npm type definitions](https://img.shields.io/npm/types/arkit.svg?style=flat-square)

- Supports JavaScript, Node.js, TypeScript and Flow code
- Identifies, connects and groups configured architectural components
- Visualises all components or some segments of the architecture
- Exports codebase visualisation as SVG, PNG or Plant UML diagram
- Integrates into development flow, so your CI, VCS, README and PRs are happy

### Usage

Add arkit to your project using NPM or Yarn and try it out:

```sh
npm install arkit --save-dev
yarn add arkit --dev
```

```sh
# Run arkit against your source folder and save result as SVG
npx arkit -o arkit.svg src/

# Also you can specify output format and source files to start from
npx arkit -o puml -f src/main.js

# And get some more with debugging and file exclusions
LEVEL=info npx arkit -o puml -e "node_modules/,test,dist,coverage"
```

First results might look messy since it's better to generate diagrams per feature, architectural layer, etc.
As you satisfied with results, add arkit command to your build script, so it will keep your architecture diagrams up-to-date.

---

### Configuration

Arkit can be configured using basic CLI arguments or advanced JSON, JS module or package.json configuration.

#### Basic CLI arguments

```console
user@machine:~$ npx arkit --help
arkit [directory]

Options:
  -o, --output     Output file paths or type, e.g. arkit.svg or puml
  -f, --first      First component file patterns, e.g. src/index.js
  -e, --exclude    File patterns to exclude, e.g. "node_modules"
  -d, --directory  Working directory                              [default: "."]
  -h, --help       Show help                                           [boolean]
  -v, --version    Show version number                                 [boolean]
```

#### Advanced arkit.json with JSON schema

```json
{
  "$schema": "https://arkit.js.org/schema.json",
  "components": [
    {
        "type": "Component",
        "patterns": ["**/*.ts", "**/*.tsx"]
    }
  ],
  "excludePatterns": ["node_modules/**", "test/**", "tests/**", "**/*.test.*", "**/*.spec.*"],
  "output": {
    "path": "arkit.svg"
  }
}
```

**See more possible JSON configuration options in the examples below**

---

### Real-world examples

#### [Express.js](https://github.com/dyatko/arkit/tree/master/test/express) using `npx arkit`
![Express architecture diagram](https://arkit.js.org/test/express/express.svg)

#### Arkit itself using `arkit -o dist/arkit.png src/`
![Arkit architecture diagram](https://arkit.js.org/dist/arkit.png)

#### [ReactDOM](https://github.com/dyatko/arkit/tree/master/test/react-dom) using `npx arkit` and [JSON config](test/react-dom/arkit.json)
![ReactDOM architecture diagram](https://arkit.js.org/test/react-dom/arkit.svg)
