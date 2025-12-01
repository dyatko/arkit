# GitHub Actions CI/CD

This directory contains GitHub Actions workflows for continuous integration and testing.

## Workflows

### PR Tests (`pr-tests.yml`)

Automatically runs on:
- Pull requests to `master` or `main` branches
- Pushes to `master` or `main` branches

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
     - Build project
     - Upload coverage to Codecov (Node 22.x only)
     - Archive build artifacts and coverage reports

2. **Lint Check** (`lint-only`)
   - Runs ESLint on the codebase
   - Checks code formatting with Prettier
   - Fast-fail for code quality issues

3. **Build Check** (`build-only`)
   - Verifies TypeScript compilation
   - Generates JSON schema
   - Validates all build artifacts are created correctly

## Environment Requirements

- **Node.js**: 18.x, 20.x, 22.x (tests run on all versions)
- **Java**: 17 (Temurin distribution)
- **PlantUML**: Latest stable version
- **Graphviz**: Required for PlantUML diagram rendering

## Artifacts

The workflow generates and stores:
- **Build artifacts** (`dist/` directory) - retained for 7 days
- **Coverage reports** - retained for 7 days and optionally uploaded to Codecov

## Coverage Reporting

Coverage reports are automatically uploaded to Codecov when:
- Running on Node.js 22.x
- A Codecov token is configured (optional, public repos work without it)

To enable Codecov integration:
1. Sign up at [codecov.io](https://codecov.io)
2. Add your repository
3. (Optional) Add `CODECOV_TOKEN` to repository secrets for private repos

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
```

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

### Cache Issues
If experiencing dependency issues:
- Clear GitHub Actions cache in repository settings
- Verify `package-lock.json` is committed
- Ensure `npm ci` is used instead of `npm install`
