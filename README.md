<img src="https://raw.githubusercontent.com/dyatko/arkit/master/arkit.svg?sanitize=true" alt="arkit" valign="top" /> `🇸🇪arkitektur`

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

# Also you can specify starting source files
npx arkit -o puml -f src/main.js

# And get some more with debugging and file exclusions
LEVEL=info npx arkit -o puml -e "node_modules/,test,dist,coverage"
```

### Configuration

Arkit can be configured using basic CLI arguments or advanced JSON, JS module or package.json configuration.

##### Basic CLI arguments

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

##### Advanced arkit.json with JSON schema

```json
{
  "$schema": "https://raw.githubusercontent.com/dyatko/arkit/master/schema.json",
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

### Real-world examples

##### Simple diagram: [Express.js](test/express) with zero config
![Express example](https://raw.githubusercontent.com/dyatko/arkit/master/test/express/express.svg?sanitize=true)

##### Complex diagram: [ReactDOM](test/react-dom) with [JSON config](test/react-dom/arkit.json)
![ReactDOM example](https://raw.githubusercontent.com/dyatko/arkit/master/test/react-dom/arkit.svg?sanitize=true)
