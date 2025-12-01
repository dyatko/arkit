# GitHub Actions Workflow Structure

## Visual Overview

```
.github/
├── workflows/
│   ├── pr-tests.yml          # Main CI workflow (132 lines)
│   ├── README.md             # Workflow documentation
│   └── WORKFLOW_STRUCTURE.md # This file
├── ISSUE_TEMPLATE/
│   ├── bug_report.md
│   └── feature_request.md
├── GITHUB_ACTIONS_MIGRATION.md # Migration guide
└── CI_IMPLEMENTATION_SUMMARY.md # Implementation summary
```

## Workflow Job Flow

```
PR Created or Push to master/main
│
├─► Test Matrix Job (Parallel on Node 18, 20, 22)
│   ├─ Checkout code
│   ├─ Setup Node.js + npm cache
│   ├─ Setup Java 17 (Temurin)
│   ├─ Install PlantUML + Graphviz
│   ├─ npm ci
│   ├─ npm run lint
│   ├─ npm run jest (with coverage)
│   ├─ npm run build
│   ├─ Upload coverage to Codecov (Node 22 only)
│   ├─ Archive dist/ artifacts
│   └─ Archive coverage reports
│
├─► Lint-Only Job
│   ├─ Checkout code
│   ├─ Setup Node.js 22 + npm cache
│   ├─ npm ci
│   ├─ npm run lint
│   └─ prettier --check
│
└─► Build-Only Job
    ├─ Checkout code
    ├─ Setup Node.js 22 + npm cache
    ├─ npm ci
    ├─ npm run compile (TypeScript)
    ├─ npm run build-schema (JSON schema)
    └─ Verify artifacts exist
```

## Environment Matrix

### Test Job Matrix
```yaml
Node.js:  [18.x, 20.x, 22.x]
Java:     17 (all versions)
PlantUML: Latest (all versions)
Graphviz: Latest (all versions)
OS:       ubuntu-latest
```

### Lint & Build Jobs
```yaml
Node.js:  22.x only
Java:     Not installed
PlantUML: Not installed
OS:       ubuntu-latest
```

## Workflow Triggers

```yaml
on:
  pull_request:
    branches: [master, main]
  push:
    branches: [master, main]
```

## Dependencies Installed

### System Packages
- PlantUML (via apt-get)
- Graphviz (via apt-get)

### Actions Used
- `actions/checkout@v4` - Repository checkout
- `actions/setup-node@v4` - Node.js setup with caching
- `actions/setup-java@v4` - Java JDK setup
- `codecov/codecov-action@v4` - Coverage upload
- `actions/upload-artifact@v4` - Artifact storage

## Artifacts Generated

### Build Artifacts (Node 22 only)
```
Name: dist-files
Path: dist/
Retention: 7 days
Contents:
  - *.js (compiled JavaScript)
  - *.d.ts (TypeScript definitions)
  - *.map (source maps)
```

### Coverage Reports (Node 22 only)
```
Name: coverage-report
Path: coverage/
Retention: 7 days
Contents:
  - lcov.info (coverage data)
  - HTML report
  - JSON report
```

## Success Criteria

All three jobs must pass for PR to be approved:

✅ **Test Matrix**: All Node versions pass tests  
✅ **Lint-Only**: Code quality standards met  
✅ **Build-Only**: Successful compilation and artifact generation  

## Failure Scenarios

| Scenario | Failed Job | Next Steps |
|----------|-----------|------------|
| Linting errors | test, lint-only | Fix ESLint/Prettier issues |
| Test failures | test | Fix failing tests |
| Build errors | test, build-only | Fix TypeScript compilation |
| Missing Java | test | Check Java setup step |
| PlantUML errors | test | Check PlantUML installation |

## Performance Optimizations

✅ **npm caching**: Faster dependency installation  
✅ **Parallel jobs**: Test, lint, build run simultaneously  
✅ **Matrix strategy**: Multiple Node versions tested in parallel  
✅ **Conditional steps**: Artifacts/coverage only on Node 22  
✅ **continue-on-error**: Codecov upload won't fail CI  

## Resource Usage

### Typical Run Times (estimated)
- Test Matrix (per Node version): ~3-5 minutes
- Lint-Only: ~1-2 minutes
- Build-Only: ~1-2 minutes
- **Total (parallel)**: ~5 minutes

### Concurrent Jobs
- 3 test jobs (Node 18, 20, 22)
- 1 lint job
- 1 build job
- **Maximum**: 5 jobs running simultaneously

## Code Coverage

```yaml
Collection: collectCoverageFrom: ["src/*.ts"]
Reporter: Jest with lcov output
Upload: Codecov (Node 22 only)
Display: GitHub PR comments (via Codecov)
```

## Environment Variables

Currently none required. Optional:
- `CODECOV_TOKEN`: For private repositories
- `LEVEL`: For debug logging in tests

## Badge Integration

Updated in README.md:
```markdown
![CI Status](https://img.shields.io/github/actions/workflow/status/dyatko/arkit/pr-tests.yml?branch=master&style=flat-square)
![Coverage](https://img.shields.io/codecov/c/github/dyatko/arkit?style=flat-square)
```

## Comparison: Before vs After

### Before (Travis CI)
```yaml
Node.js: 10 only
Java: ❌ None
Tests: Single version
Coverage: Code Climate
Artifacts: ❌ None
Matrix: ❌ None
```

### After (GitHub Actions)
```yaml
Node.js: 18, 20, 22
Java: ✅ 17 + PlantUML
Tests: 3 versions parallel
Coverage: Codecov
Artifacts: ✅ dist + coverage
Matrix: ✅ Full matrix
```

## Maintenance

### Updating Node Versions
Edit matrix in `pr-tests.yml`:
```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x, 22.x]  # Add/remove as needed
```

### Updating Java Version
Edit Java setup step:
```yaml
- name: Setup Java
  uses: actions/setup-java@v4
  with:
    distribution: 'temurin'
    java-version: '17'  # Change version here
```

### Adding New Jobs
Follow the pattern of existing jobs in `pr-tests.yml`

## Security Notes

✅ Uses `npm ci` for reproducible builds  
✅ No secrets required for public repos  
✅ Artifacts auto-deleted after 7 days  
✅ Actions pinned to major versions (@v4)  
✅ Codecov upload continues on error  

---

**File Location**: `.github/workflows/pr-tests.yml`  
**Workflow Name**: `PR Tests`  
**Status**: ✅ Ready for Use
