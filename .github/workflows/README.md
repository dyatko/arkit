# GitHub Actions CI/CD

This directory contains GitHub Actions workflows for continuous integration, testing, and automated publishing.

## Workflows

### PR Tests & Build Verification (`pr-tests.yml`)

Automatically runs on:
- Pull requests to `master` or `main` branches
- Pushes to `master` or `main` branches

#### Jobs

1. **Test Matrix** (`test`)
   - Tests across Node.js versions: 20.x, 22.x, 24.x
   - Includes Java 17 and PlantUML for diagram generation support
   - Steps:
     - Checkout code
     - Setup Node.js with npm caching
     - Setup Java (Temurin distribution)
     - Install PlantUML and Graphviz
     - Install dependencies with `npm ci`
     - Run linting
     - Run tests with coverage
     - **Build project** - verify the package builds successfully
     - **Verify build artifacts** - ensure critical output files exist
     - Archive build artifacts (Node 22.x only)
     - Upload coverage to Codecov (Node 22.x only)

2. **Lint Check** (`lint-only`)
   - Runs ESLint on the codebase
   - Checks code formatting with Prettier
   - Fast-fail for code quality issues

### Publish to NPM (`publish.yml`)

Automatically runs on:
- Pushes to `master` or `main` branches (typically after PR merge)

Uses **npm Trusted Publishing** (OIDC) - no NPM_TOKEN secret needed.

#### Jobs

1. **Test** (`test`)
   - Tests across Node.js versions: 20.x, 22.x, 24.x
   - Runs full test suite including linting
   - Must pass before publishing (fail-fast)

2. **Publish to NPM** (`publish`)
   - Runs only if all tests pass
   - Uses Node.js 22.x for publishing
   - Uses OIDC Trusted Publishing (no token secrets required)
   - Steps:
     - Build project
     - **Check if version exists** - queries npm registry
     - **Publish to npm** - only if version is new (`npm publish --provenance --access public`)
     - **Create Git tag** - tags release with version number
     - **Skip publishing** - if version already exists (no-op)

## Environment Requirements

- **Node.js**: 20.x, 22.x, 24.x (tests run on all versions)
- **Java**: 17 (Temurin distribution)
- **PlantUML**: Latest stable version
- **Graphviz**: Required for PlantUML diagram rendering

## Secrets

### CODECOV_TOKEN (Optional)
Optional for coverage reporting. Public repositories work without it.

### Trusted Publishing (npm)
Publishing uses OIDC-based Trusted Publishing configured on npmjs.com.
No `NPM_TOKEN` secret is needed. The workflow requires `permissions: id-token: write`.

To set up Trusted Publishing:
1. Go to [npmjs.com](https://www.npmjs.com) package settings
2. Configure Trusted Publishing for `dyatko/arkit` repository
3. Specify the `publish.yml` workflow

## Publishing Flow

1. **Development**: Create feature branch, make changes, open PR
2. **PR Review**: `pr-tests.yml` runs automatically (tests + build verification)
3. **Merge**: Update version in `package.json`, merge PR
4. **Automated Publishing**: `publish.yml` tests, checks npm, publishes if version is new, creates git tag

## Build Output

Starting from version 2.0.0, the `dist/` folder is **no longer committed** to the repository:
- **Why**: Reduces repository size, keeps git history clean
- **CI/CD**: Build artifacts are generated automatically in workflows
- **NPM**: Published packages include `dist/` (built during `npm publish`)
- **Local Development**: Run `npm run build` to generate `dist/` locally
