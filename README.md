![arkit](https://raw.githubusercontent.com/dyatko/arkit/master/arkit.svg?sanitize=true)

## arkit _[🇸🇪arkitektur]_ visualises architectures of JavaScript, TypeScript and Flow codebases as meaningful and committable diagrams

[![NPM](https://img.shields.io/npm/v/arkit.svg?style=flat-square)](https://www.npmjs.com/package/arkit)
[![Travis](https://img.shields.io/travis/dyatko/arkit.svg?style=flat-square)](https://travis-ci.org/dyatko/arkit)
[![Code Climate coverage](https://img.shields.io/codeclimate/coverage/dyatko/arkit.svg?style=flat-square)](https://codeclimate.com/github/dyatko/arkit/code)
[![Code Climate technical debt](https://img.shields.io/codeclimate/tech-debt/dyatko/arkit.svg?style=flat-square)](https://codeclimate.com/github/dyatko/arkit/issues)

- Supports JavaScript, Node.js, TypeScript and Flow code
- Identifies, connects and groups configured architectural components
- Visualises all components or some segments of the architecture
- Exports codebase visualisation as PlantUML, SVG or PNG
- Integrates into development flow, so your CI, VCS, README and PRs are happy

### Usage

Add arkit to your project using NPM or Yarn:

```$sh
npm install arkit --save-dev
yarn add arkit --dev
```

### Configuration

Arkit can be configured using basic CLI arguments or advanced JSON, JS module or package.json configuration. JSON schema can assist with available options.

##### CLI arguments

```$sh
npx arkit --help
```

##### JSON config

```$json
{
  "$schema": "https://raw.githubusercontent.com/dyatko/arkit/master/schema.json"
}
```

### Real-world examples

##### Simple example (Express.js, zero config)
![Express example](https://raw.githubusercontent.com/dyatko/arkit/master/test/express/express.svg?sanitize=true)

##### Complex example (ReactDOM, JSON config)
![ReactDOM example](https://raw.githubusercontent.com/dyatko/arkit/master/test/react-dom/arkit.svg?sanitize=true)
