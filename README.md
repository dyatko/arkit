<p align="center">
  <a href="https://arkit.pro"><img src="arkit.svg?sanitize=true" alt="arkit" /></a><br />
  <code>🇸🇪arkitektur</code>
</p>
<p align="center">
  <a href="https://www.npmjs.com/arkit"><img src="https://img.shields.io/npm/v/arkit.svg?label=%20&style=flat-square" alt="Arkit NPM package" /></a>
  <a href="https://www.npmjs.com/arkit"><img src="https://img.shields.io/npm/dw/arkit.svg?style=flat-square" alt="Download arkit" /></a>
  <a href="https://libraries.io/npm/arkit/dependents"><img src="https://img.shields.io/librariesio/dependents/npm/arkit.svg?style=flat-square" alt="Dependents" /></a>
  <a href="https://travis-ci.org/dyatko/arkit/branches"><img src="https://img.shields.io/travis/dyatko/arkit/master.svg?style=flat-square" alt="Build status" /></a>
  <a href="https://codeclimate.com/github/dyatko/arkit/code"><img src="https://img.shields.io/codeclimate/coverage/dyatko/arkit.svg?style=flat-square" alt="Test coverage" /></a>
  <a href="https://codeclimate.com/github/dyatko/arkit/issues"><img src="https://img.shields.io/codeclimate/tech-debt/dyatko/arkit.svg?style=flat-square" alt="Technical debt" /></a>
</p>

# Visualises JavaScript, TypeScript and Flow codebases as meaningful and committable architecture diagrams

Arkit is a powerful static analysis tool that automatically generates visual architecture diagrams from your codebase, making it easy to understand and communicate software structure.

## Key Features

- **Automatic Code Analysis**: Analyzes JavaScript, TypeScript, Flow, Vue, and Nuxt source files
- **Component Grouping**: Associates source files with configured architectural components
- **Dependency Visualization**: Renders grouped components and dependency graph including Node.js modules
- **Multiple Export Formats**: Exports as SVG, PNG, or PlantUML diagrams
- **CI/CD Integration**: Integrates seamlessly into development flow for automated documentation
- **Configurable**: Flexible configuration via CLI arguments or JSON/JS config files
- **Real-time Updates**: Keep architecture diagrams synchronized with code changes

## Quick Start

```sh
# Run arkit instantly without installation
npx arkit
```

This will analyze your current directory and generate an `arkit.svg` diagram showing your project's architecture.

## Installation

```sh
# Add as a dev dependency to your project
npm install arkit --save-dev
# or
yarn add arkit --dev
```

## Usage Examples

```sh
# Generate SVG diagram from source folder
npx arkit src/ -o arkit.svg

# Specify entry files and output format (PlantUML)
npx arkit -f src/main.js -o puml

# Enable debugging and exclude specific paths
LEVEL=info npx arkit -e "node_modules,test,dist,coverage" -o puml

# Generate both SVG and PNG
npx arkit -o arkit.svg && npx arkit -o arkit.png
```

:warning: Arkit is using a web service to convert PlantUML to SVG/PNG. 
It's hosted at arkit.pro and does not store any data.
**If you want to use Arkit at work make sure this is fine with your company tools policy**.

If your project is huge and first diagrams look messy, it's better to generate them per feature, architectural layer, etc.

Once you satisfied with results, add arkit command to your build script, so it will keep your architecture diagrams up-to-date.

## Configuration

Arkit can be configured using basic CLI arguments or advanced JSON, JS module or package.json configuration.

#### Basic CLI arguments

```console
user@machine:~$ npx arkit --help
arkit [directory]

Options:
  -d, --directory  Working directory                              [default: "."]
  -c, --config     Config file path (json or js)         [default: "arkit.json"]
  -o, --output     Output path or type (svg, png or puml) [default: "arkit.svg"]
  -f, --first      File patterns to be first in the graph               [string]
  -e, --exclude    File patterns to exclude from the graph
        [default: "test,tests,dist,coverage,**/*.test.*,**/*.spec.*,**/*.min.*"]
  -h, --help       Show help                                           [boolean]
  -v, --version    Show version number                                 [boolean]
```

#### Advanced arkit.json with JSON schema for autocomplete and validation

```json
{
  "$schema": "https://arkit.pro/schema.json",
  "excludePatterns": ["test/**", "tests/**", "**/*.test.*", "**/*.spec.*"],
  "components": [
    {
      "type": "Dependency",
      "patterns": ["node_modules/*"]
    },
    {
      "type": "Component",
      "patterns": ["**/*.ts", "**/*.tsx"]
    }
  ],
  "output": [
    {
      "path": "arkit.svg",
      "groups": [
        {
          "first": true,
          "components": ["Component"]
        },
        {
          "type": "Dependencies",
          "components": ["Dependency"]
        }
      ]
    }
  ]
}
```

**See more possible JSON configuration options in the examples below**

## Real-world examples

#### [Express.js](https://github.com/dyatko/arkit/tree/master/test/express) using `npx arkit`
![Express architecture graph](test/express/express.svg?sanitize=true)

#### [Arkit itself](https://github.com/dyatko/arkit/tree/master/src) using `npx arkit` and [config in package.json](https://github.com/dyatko/arkit/blob/master/package.json#L17)
![Arkit dependency graph](dist/arkit.svg?sanitize=true)

#### [ReactDOM](https://github.com/dyatko/arkit/tree/master/test/react-dom) using `npx arkit` and [config in arkit.json](https://github.com/dyatko/arkit/blob/master/test/react-dom/react-arkit.json)
![ReactDOM architecture graph](test/react-dom/arkit.svg?sanitize=true)

#### [Vue/Nuxt TodoMVC](https://github.com/dyatko/arkit-nuxt-todomvc) using `yarn arkit -o arkit.svg`
![Vue and Nuxt dependency graph](https://raw.githubusercontent.com/dyatko/arkit-nuxt-todomvc/master/arkit.svg?sanitize=true)

## Contribution

The tool is under active development, so please feel free to [contribute with suggestions](https://github.com/dyatko/arkit/issues/new/choose) and pull requests. Your feedback is priceless.

#### Relevant projects

- [Dependency cruiser](https://github.com/sverweij/dependency-cruiser) validates and visualizes dependencies
- [Madge](https://github.com/pahen/madge) generates a visual graph of module dependencies
- [dependo](https://github.com/auchenberg/dependo) visualizes CommonJS, AMD, or ES6 module dependencies
- [JSCity](https://github.com/aserg-ufmg/JSCity) visualizes JavaScript source code as navigable 3D cities
- [colony](https://github.com/hughsk/colony) in-browser graphs representing the links between your Node.js code and its dependencies
- [TsUML](https://github.com/remojansen/TsUML) generates UML diagrams from TypeScript source code

<h4 align="center">Fun stats, stargazers map by <a href="https://github.com/dyatko/worldstar">worldstar</a></h4>

<p align="center"><img src="worldstar.svg?sanitize=true" alt="GitHub stargazer map" /><br /><a href="https://github.com/dyatko/arkit">Give a Github star</a> to get on the map.</p>
