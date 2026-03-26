# Arkit - Agent Instructions

Arkit generates architecture diagrams from JavaScript, TypeScript, Flow, Vue, and Nuxt codebases via static analysis using ts-morph.

## Build & Test

- `npm run build` - compile TypeScript + format + generate schema
- `npm test` - lint + test with coverage
- `npm run jest` - tests only
- `npm run architecture` - generate arkit's own diagram

## Source Structure

- `src/arkit.ts` - Main entry point, orchestrates pipeline
- `src/cli.ts` - Yargs CLI definition
- `src/parser.ts` - ts-morph code analysis
- `src/generator.ts` - Component grouping and dependency graph
- `src/puml.ts` - PlantUML generation
- `src/converter.ts` - PlantUML to SVG/PNG (local Java)
- `src/config.ts` - Configuration loading and merging
- `src/types.ts` - TypeScript interfaces and types
- `index.js` - CLI entry point (CommonJS, requires build)

## CLI Usage

```bash
npx arkit [directory] -o arkit.svg     # Generate SVG diagram
npx arkit --json -o arkit.svg          # Machine-readable JSON output
npx arkit -o puml                      # PlantUML text output (no Java needed)
```

## Programmatic API

```typescript
const { arkit } = require('arkit');
const results = await arkit({ directory: './src', output: ['arkit.svg'] });
```

## Conventions

- CommonJS (`module: "commonjs"` in tsconfig)
- Pre-commit: Prettier + ESLint via husky + lint-staged on `{src,test}/*.ts`
- Tests: Jest with ts-jest, snapshot tests in `test/`
- Fixture dirs added to `testPathIgnorePatterns` in package.json
- Informational output goes to stderr; structured output to stdout

## For Detailed Documentation

See `CLAUDE.md` in this repository for comprehensive AI agent documentation.
