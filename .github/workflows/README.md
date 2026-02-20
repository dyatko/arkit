# GitHub Actions CI/CD

This directory contains GitHub Actions workflows for continuous integration, testing, and automated publishing.

## Workflows

### PR Tests & Build Verification (`pr-tests.yml`)

Automatically runs on:
- Pull requests to `master` or `main` branches

#### Jobs

1. **Test Matrix** (`test`)
   - Tests across Node.js versions: 18.x, 20.x, 22.x
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

**Important**: This workflow does NOT publish to npm. It only verifies that:
- Tests pass
- Code is properly formatted
- Project builds successfully
- Version in package.json is not accidentally published

### Build and Publish to NPM (`publish.yml`)

Automatically runs on:
- Pushes to `master` or `main` branches (typically after PR merge)

#### Jobs

1. **Test before Publishing** (`test`)
   - Tests across Node.js versions: 18.x, 20.x, 22.x
   - Runs full test suite including linting
   - Builds the project
   - Must pass before publishing

2. **Publish to NPM** (`publish`)
   - Runs only if all tests pass
   - Uses Node.js 22.x (LTS) for publishing
   - Steps:
     - Checkout code
     - Setup Node.js with npm registry
     - Install dependencies
     - Build project
     - **Check if version exists** - queries npm registry
     - **Publish to npm** - only if version is new
       - Uses npm provenance for supply chain security
       - Requires `NPM_TOKEN` secret
     - **Create Git tag** - tags release with version number
     - **Skip publishing** - if version already exists (no-op)

**Important**: This workflow automatically publishes when:
- All tests pass
- Version in `package.json` is new (not yet on npm)
- `NPM_TOKEN` secret is configured

## Environment Requirements

- **Node.js**: 18.x, 20.x, 22.x (tests run on all versions)
- **Java**: 17 (Temurin distribution)
- **PlantUML**: Latest stable version
- **Graphviz**: Required for PlantUML diagram rendering

## Secrets Required

### NPM_TOKEN
Required for automated publishing to npm.

To set up:
1. Generate an npm access token:
   - Log in to [npmjs.com](https://www.npmjs.com)
   - Go to Access Tokens in your account settings
   - Generate a new **Automation** token
2. Add to GitHub repository secrets:
   - Go to repository Settings → Secrets and variables → Actions
   - Add new secret named `NPM_TOKEN`
   - Paste your npm token

### CODECOV_TOKEN (Optional)
Optional for coverage reporting. Public repositories work without it.

## Artifacts

The workflows generate and store:
- **Build artifacts** (`dist/` directory) - retained for 7 days (PR workflow only)
- **Coverage reports** - retained for 7 days and optionally uploaded to Codecov

## Publishing Flow

### Standard Release Process

1. **Development**:
   - Create feature branch
   - Make changes
   - Push and open PR

2. **PR Review**:
   - PR workflow runs automatically
   - Verifies tests pass and project builds
   - No publishing occurs

3. **Merge to Master/Main**:
   - Update version in `package.json` (e.g., from 1.6.4 to 2.0.0)
   - Merge PR to master/main
   - Publish workflow runs automatically

4. **Automated Publishing**:
   - Tests run on all Node versions
   - If tests pass, checks if version exists on npm
   - If version is new, publishes to npm with provenance
   - Creates git tag (e.g., `v2.0.0`)

5. **No Version Change**:
   - If version already exists, workflow completes without publishing
   - Useful for non-release commits (docs, CI changes, etc.)

### Version Bumping Strategy

Use semantic versioning:
- **Patch** (1.6.4 → 1.6.5): Bug fixes, small changes
- **Minor** (1.6.4 → 1.7.0): New features, backwards compatible
- **Major** (1.6.4 → 2.0.0): Breaking changes

## Local Testing

To run the same checks locally:

```bash
# Install dependencies
npm ci

# Run linting
npm run lint

# Check formatting
npx prettier --check "{src,test}/*.ts"

# Run tests with coverage
npm run jest

# Build project
npm run build

# Verify build output
ls -la dist/
```

## Local Publishing (Manual)

If needed, you can still publish manually:

```bash
# Ensure you're on master/main and up to date
git checkout main
git pull

# Update version
npm version patch  # or minor, or major

# Build and test (runs automatically via prepack)
npm publish
```

**Note**: Manual publishing is discouraged. Use the automated workflow instead.

## Build Output

Starting from version 2.0.0, the `dist/` folder is **no longer committed** to the repository:
- **Why**: Reduces repository size, keeps git history clean
- **CI/CD**: Build artifacts are generated automatically in workflows
- **NPM**: Published packages include `dist/` (built during `npm publish`)
- **Local Development**: Run `npm run build` to generate `dist/` locally

## Troubleshooting

### PlantUML Issues
If PlantUML conversion fails in CI:
- Check Java version compatibility
- Verify Graphviz installation
- Review PlantUML logs in the workflow output

### Node.js Version Issues
If tests fail on specific Node versions:
- Check `package.json` engines field
- Review Node.js compatibility for dependencies
- Update matrix versions in workflow as needed

### Publishing Failures

**"Version already exists"**
- This is expected if version wasn't bumped
- Update version in `package.json` and push again

**"NPM_TOKEN not found"**
- Ensure `NPM_TOKEN` secret is configured in repository settings
- Verify token has publishing permissions

**"Build artifacts missing"**
- Check build step succeeded in logs
- Verify TypeScript compilation completed
- Review `tsconfig.json` and build scripts

### Cache Issues
If experiencing dependency issues:
- Clear GitHub Actions cache in repository settings
- Verify `package-lock.json` is committed
- Ensure `npm ci` is used instead of `npm install`

## Coverage Reporting

Coverage reports are automatically uploaded to Codecov when:
- Running on Node.js 22.x
- A Codecov token is configured (optional, public repos work without it)

To enable Codecov integration:
1. Sign up at [codecov.io](https://codecov.io)
2. Add your repository
3. (Optional) Add `CODECOV_TOKEN` to repository secrets for private repos

## Workflow Diagram

```
┌─────────────┐
│  PR Created │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│  pr-tests.yml           │
│  • Lint                 │
│  • Test (18, 20, 22)    │
│  • Build verification   │
└─────────────────────────┘
       │
       ▼
┌─────────────┐
│  PR Merged  │
│  to main    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│  publish.yml            │
│  • Test (18, 20, 22)    │
│  • Check version        │
│  • Publish if new       │
│  • Create git tag       │
└─────────────────────────┘
```
