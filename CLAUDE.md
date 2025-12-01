# Arkit - AI Agent Documentation

This document provides a comprehensive overview of Arkit for AI agents to quickly understand the project structure, functionality, and codebase.

## Project Overview

**Arkit** is a static code analysis and visualization tool written in TypeScript that automatically generates architecture diagrams from JavaScript, TypeScript, Flow, Vue, and Nuxt codebases.

- **Repository**: https://github.com/dyatko/arkit
- **Website**: https://arkit.pro
- **NPM**: https://www.npmjs.com/arkit
- **License**: MIT
- **Current Version**: 1.6.4

## What Does Arkit Do?

Arkit analyzes source code files in a project, identifies dependencies between modules, groups them into architectural components, and generates visual diagrams in multiple formats (SVG, PNG, PlantUML).

### Key Use Cases

1. **Architecture Documentation**: Auto-generate and maintain up-to-date architecture diagrams
2. **Code Understanding**: Quickly visualize dependencies in unfamiliar codebases
3. **Onboarding**: Help new team members understand project structure
4. **CI/CD Integration**: Keep architecture documentation synchronized with code
5. **Code Reviews**: Visualize impact of changes on system architecture

## How It Works

### Processing Pipeline

```
CLI/API Input → Config → Parser → Generator → PlantUML → Converter → SVG/PNG Output
```

1. **Configuration** (`config.ts`): Loads CLI args, JSON config, or package.json settings
2. **Parser** (`parser.ts`): Uses `ts-morph` to analyze TypeScript/JavaScript files and extract imports/exports
3. **Generator** (`generator.ts`): Organizes files into component groups and builds dependency graph
4. **PUML** (`puml.ts`): Converts dependency graph to PlantUML format
5. **Converter** (`converter.ts`): Converts PlantUML to SVG/PNG locally using node-plantuml
6. **Filesystem** (`filesystem.ts`): Saves generated diagrams to disk

## Architecture & Source Files

### Core Components

#### `src/arkit.ts` - Main Entry Point
- Orchestrates the entire pipeline
- Exports main `arkit()` function and helper functions
- Manages progress bar display

#### `src/cli.ts` - Command Line Interface
- Uses `yargs` for argument parsing
- Defines CLI options: directory, config, output, first, exclude
- Default output: `arkit.svg`

#### `src/config.ts` - Configuration Management
- Loads configuration from multiple sources (CLI, JSON, package.json)
- Validates against JSON schema
- Merges and normalizes configuration options
- Supports component grouping and output customization

#### `src/parser.ts` - Code Analysis
- Uses `ts-morph` (TypeScript Compiler API wrapper)
- Analyzes source files to extract:
  - Import statements
  - Export declarations
  - Module dependencies
  - File paths and patterns
- Supports TypeScript, JavaScript, Flow, Vue, Nuxt

#### `src/generator.ts` - Graph Generation
- Transforms parsed files into component groups
- Builds dependency graph between components
- Applies filtering rules (exclude patterns)
- Organizes output according to configuration

#### `src/puml.ts` - PlantUML Generation
- Converts component graph to PlantUML syntax
- Handles component grouping and relationships
- Generates PlantUML markup for diagrams

#### `src/converter.ts` - Format Conversion
- Converts PlantUML to SVG/PNG locally using `node-plantuml`
- Handles direct PUML output
- Manages local Java process execution for PlantUML rendering
- Provides helpful error messages if Java is not installed

#### `src/filesystem.ts` - File Operations
- File discovery and pattern matching
- File reading and writing
- Path resolution

#### `src/utils.ts` - Utility Functions
- Path manipulation
- Array helpers
- Logging utilities

#### `src/logger.ts` - Logging
- Uses `pino` logger
- Supports different log levels via LEVEL environment variable

#### `src/types.ts` - TypeScript Type Definitions
- Core interfaces and types used throughout the application

#### `src/schema.ts` - Configuration Schema
- JSON schema definition for configuration validation
- Used to generate `schema.json` for IDE autocomplete

## Configuration Options

### CLI Arguments

```bash
-d, --directory   # Working directory (default: ".")
-c, --config      # Config file path (default: "arkit.json")
-o, --output      # Output path or type: svg, png, puml (default: "arkit.svg")
-f, --first       # File patterns to prioritize in graph
-e, --exclude     # File patterns to exclude (default: test files, dist, etc.)
```

### JSON Configuration (`arkit.json`)

```json
{
  "$schema": "https://arkit.pro/schema.json",
  "excludePatterns": ["test/**", "**/*.test.*"],
  "components": [
    {
      "type": "Component",
      "patterns": ["**/*.ts"]
    }
  ],
  "output": [
    {
      "path": "arkit.svg",
      "groups": [
        {
          "first": true,
          "components": ["Component"]
        }
      ]
    }
  ]
}
```

### package.json Configuration

Configuration can also be placed in `package.json` under the `"arkit"` key.

## Dependencies

### Production Dependencies
- **ts-morph**: TypeScript Compiler API wrapper for code analysis
- **yargs**: CLI argument parsing
- **pino**: Fast logger
- **nanomatch**: File pattern matching (globbing)
- **resolve**: Module resolution
- **progress**: Progress bar display
- **tsconfig-paths**: TypeScript path mapping support
- **node-plantuml**: Local PlantUML converter (requires Java JRE 8+)

### Development Dependencies
- **TypeScript**: Language and compiler
- **Jest**: Testing framework
- **ESLint**: Code linting
- **Prettier**: Code formatting

### System Dependencies
- **Java JRE 8+**: Required by PlantUML for diagram rendering
  - Windows: Download from https://adoptium.net/
  - macOS: `brew install openjdk`
  - Linux: `sudo apt-get install default-jre`
  
- **GraphViz**: Required by PlantUML for complex diagram layouts (dot command)
  - Windows: Download from https://graphviz.org/download/
  - macOS: `brew install graphviz`
  - Linux: `sudo apt-get install graphviz`
  
**Note**: Users can avoid system dependencies by using `--output puml` to generate PlantUML files only, which can be rendered separately.

### Node.js Alternatives to GraphViz (Future Consideration)

While Arkit currently requires system-level GraphViz, there are pure Node.js alternatives that could eliminate this dependency:

1. **@hpcc-js/wasm** (Recommended)
   - WebAssembly port of Graphviz
   - No system dependencies required
   - Actively maintained by HPCC Systems
   - Drop-in replacement for Graphviz
   - `npm install @hpcc-js/wasm`

2. **@viz-js/viz**
   - Modern maintained version of viz.js
   - Pure JavaScript/WebAssembly
   - Smaller bundle size than @hpcc-js/wasm
   - `npm install @viz-js/viz`

3. **Viz.js** (Legacy)
   - Original Emscripten port of Graphviz
   - No longer actively maintained
   - Still widely used but consider alternatives

**Implementation Note**: To use these alternatives with `node-plantuml`, you would need to:
- Install the WebAssembly GraphViz package
- Configure PlantUML to use the JS-based renderer instead of system `dot` command
- This would require modifications to `src/converter.ts` and potentially switching from `node-plantuml` to a custom PlantUML integration

**Trade-offs**:
- ✅ Eliminates system dependency (easier installation)
- ✅ Better cross-platform compatibility
- ❌ Larger npm package size (WASM bundles are ~10-20MB)
- ❌ May have slightly slower performance for very large diagrams
- ❌ Requires additional implementation work

## Important Notes

### Local PlantUML Conversion
✅ Arkit uses **local PlantUML conversion** via the `node-plantuml` library. This means:
- **No external web service calls** - All conversion happens locally using Java
- **Your code stays private** - No data is sent over the network
- **Works offline** - Generate diagrams without internet connection
- **Requires Java Runtime Environment (JRE) 8+** to be installed
- PlantUML `.puml` files can still be exported using `--output puml` for use with other tools

#### Java Installation
If Java is not installed, users will see a helpful error message with installation instructions:
- **Windows**: Download from https://adoptium.net/
- **macOS**: `brew install openjdk`
- **Linux**: `sudo apt-get install default-jre` (Ubuntu/Debian) or `sudo yum install java-openjdk` (RHEL/CentOS)

Verify installation: `java -version`

### File Exclusions
By default, Arkit excludes:
- `test`, `tests` directories
- `dist`, `coverage` directories
- Files matching `**/*.test.*`, `**/*.spec.*`, `**/*.min.*`
- `node_modules` (unless explicitly configured)

## Development Workflow

### Building
```bash
npm run build          # Compile TypeScript, format code, generate schema
npm run compile        # TypeScript compilation only
npm run build-schema   # Generate JSON schema from TypeScript types
```

### Testing
```bash
npm test              # Run linting and tests with coverage
npm run jest          # Run tests only
npm run lint          # Run ESLint
```

### Running
```bash
npm run architecture  # Generate diagram for Arkit itself
./index.js            # Direct execution
```

## Common Modification Scenarios

### Adding Support for New File Types
1. Update `parser.ts` to handle new file extensions
2. Modify `filesystem.ts` file discovery logic
3. Update TypeScript types in `types.ts`

### Changing Output Format
1. Modify `converter.ts` to add new conversion logic
2. Update `OutputFormat` enum in `types.ts`
3. Add CLI option handling in `cli.ts`

### Modifying Component Grouping
1. Update `generator.ts` component grouping logic
2. Modify schema in `schema.ts` for new grouping options
3. Update documentation

### Customizing PlantUML Output
1. Modify `puml.ts` to change diagram syntax
2. Update component styling and layout

## Testing

### Test Structure
- Test files: `test/*.test.ts`
- Real-world examples: `test/express/`, `test/react-dom/`
- Coverage reports: Run with `npm test`

### Test Exclusions
Large projects like `react-dom`, `express`, `angular2_es2015` are excluded from unit tests but used as integration examples.

## Entry Points

### Command Line
```bash
npx arkit [directory] [options]
```

### Programmatic API
```typescript
import { arkit } from 'arkit';

arkit({
  directory: './src',
  output: 'architecture.svg'
}).then(results => {
  console.log('Generated:', results);
});
```

### Node.js Module
```javascript
const { arkit } = require('arkit');
```

## Output Formats

### SVG (Default)
- Scalable vector graphics
- Best for web and documentation
- **Converted locally using node-plantuml**
- Requires Java JRE 8+

### PNG
- Raster image format
- Good for presentations and PDFs
- **Converted locally using node-plantuml**
- Requires Java JRE 8+

### PlantUML (PUML)
- Text-based diagram format
- Text output, no conversion needed
- Good for version control
- Can be rendered with external PlantUML tools

## Key Algorithms

### Dependency Resolution
1. Parse all source files for imports/exports
2. Resolve module paths (relative, absolute, node_modules)
3. Build dependency graph
4. Apply component grouping rules
5. Filter excluded patterns
6. Generate hierarchical structure

### Component Grouping
1. Match files against component patterns
2. Assign files to component types
3. Group dependencies between components
4. Handle first/priority components
5. Organize into layers for visualization

## Performance Considerations

- Uses `ts-morph` for efficient TypeScript parsing
- Implements progress bar for user feedback
- Processes files in parallel where possible
- Caches parsed results during single run

## Troubleshooting for AI Agents

### Common Issues
1. **Missing dependencies**: Run `npm install`
2. **TypeScript errors**: Run `npm run compile` to check
3. **Config not loading**: Check `arkit.json` syntax or package.json
4. **Large codebases**: Use `-e` to exclude unnecessary files or `-f` to focus on specific entry points

### Debugging
- Set `LEVEL=debug` or `LEVEL=info` environment variable
- Check generated PlantUML with `-o puml` before conversion
- Verify file patterns with `--exclude` and `--first` options

## Related Files

- `schema.json`: JSON schema for configuration validation
- `tsconfig.json`: TypeScript compiler configuration
- `package.json`: Project metadata and scripts
- `.travis.yml`: CI/CD configuration
- `index.js`: CLI entry point (compiled)

## Example Workflows

### Generate Diagram for New Project
```bash
cd /path/to/project
npx arkit src/ -o docs/architecture.svg
```

### Update Diagram in CI/CD
```bash
npm run architecture
git add dist/arkit.svg
git commit -m "Update architecture diagram"
```

### Focus on Specific Module
```bash
npx arkit -f src/core/index.ts -o core-architecture.svg
```

### Export PlantUML for Custom Rendering
```bash
npx arkit -o arkit.puml
plantuml arkit.puml  # Use local PlantUML
```

## Summary for AI Agents

When working with Arkit:
1. **Read first**: Check `README.md`, `package.json`, and configuration files
2. **Core logic**: Focus on `parser.ts`, `generator.ts`, and `arkit.ts`
3. **Entry points**: `index.js` (CLI) and exported functions in `arkit.ts`
4. **Configuration**: Support CLI args, JSON config, and package.json
5. **Testing**: Use examples in `test/` directory for validation
6. **Build**: Always run `npm run build` after source changes
7. **Dependencies**: Respect the external service usage for conversions

This tool is mature, well-tested, and actively maintained. The codebase is clean with good separation of concerns.
