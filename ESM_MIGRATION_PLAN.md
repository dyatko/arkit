# ESM Migration Plan for Arkit

## Current State (as of Dec 2025)

**Module System:** CommonJS (CJS)
- TypeScript compiles to CommonJS (`"module": "commonjs"`)
- `index.js` uses `require()` 
- Compatible with Node.js 12+

**Dependency Constraints:**
- `yargs` locked to v17.7.2 (last CJS-compatible version)
- `yargs` v18+ requires ESM and cannot be `require()`'d
- Other modern dependencies increasingly ESM-only

**Problem:** The JavaScript ecosystem is moving to ESM, and staying on CommonJS limits access to modern tooling and dependencies.

---

## Migration Strategy: Dual Package Approach

**Goal:** Support both ESM and CommonJS for backwards compatibility

### Phase 1: Source Migration to ESM

**1.1 Update package.json**

```json
{
  "type": "module",
  "main": "./dist/cjs/index.cjs",
  "module": "./dist/esm/index.js",
  "types": "./dist/esm/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.cjs"
    },
    "./package.json": "./package.json"
  },
  "bin": {
    "arkit": "./bin/arkit.js"
  },
  "engines": {
    "node": ">=16.0.0"
  }
}
```

**1.2 Convert Source Files**

All `*.ts` files in `src/`:
- Change `import x = require('x')` → `import x from 'x'`
- Change `export =` → `export default`
- Use `.js` extensions in relative imports: `import { foo } from './bar.js'`

Example:
```typescript
// Before (CommonJS style)
import * as fs from "fs";
import * as path from "path";

// After (ESM style)
import fs from "fs";
import path from "path";
// or
import { readFileSync } from "fs";
```

**1.3 Update TypeScript Configuration**

Create `tsconfig.esm.json`:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "ES2020",
    "moduleResolution": "node",
    "target": "ES2020",
    "outDir": "dist/esm",
    "declaration": true,
    "declarationMap": true
  }
}
```

Create `tsconfig.cjs.json`:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node",
    "target": "ES2015",
    "outDir": "dist/cjs",
    "declaration": true,
    "declarationMap": true
  }
}
```

**1.4 Update Build Scripts**

```json
{
  "scripts": {
    "clean": "rm -rf dist",
    "build:esm": "tsc --project tsconfig.esm.json",
    "build:cjs": "tsc --project tsconfig.cjs.json && echo '{\"type\":\"commonjs\"}' > dist/cjs/package.json",
    "build": "npm run clean && npm run build:esm && npm run build:cjs",
    "compile": "npm run build"
  }
}
```

The `package.json` in `dist/cjs/` tells Node.js to treat `.js` files there as CommonJS.

---

### Phase 2: CLI Entry Point

**2.1 Create ESM-compatible CLI wrapper**

`bin/arkit.js`:
```javascript
#!/usr/bin/env node

// Detect if we're running as ESM or CJS
const isESM = typeof import.meta !== 'undefined';

if (isESM) {
  // ESM entry
  import('../dist/esm/cli.js').then(({ cli }) => {
    // ... CLI logic
  });
} else {
  // CJS fallback
  const { cli } = require('../dist/cjs/index.cjs');
  // ... CLI logic
}
```

Or simpler: Use pure ESM and require Node.js 16+:

`bin/arkit.js`:
```javascript
#!/usr/bin/env node
import { cli, arkit, getConfig, getOutputs } from '../dist/esm/index.js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cli.epilogue(`${pkg.description} ${pkg.homepage}`)
     .version(pkg.version)
     .help('help');
  
  // ... rest of CLI logic
}
```

**2.2 Remove old `index.js`**

The old `index.js` becomes unnecessary as package.json `exports` handles routing.

---

### Phase 3: Dependencies Update

**3.1 Upgrade yargs**

```bash
npm install yargs@latest  # v18+
```

**3.2 Update yargs usage for ESM**

```typescript
// src/cli.ts
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

export const cli = yargs(hideBin(process.argv))
  .scriptName('arkit')
  .usage('Usage: $0 [directory] [options]')
  // ... rest of config
```

**3.3 Other dependencies**

Check for ESM-only updates:
- `nanomatch` → `picomatch` (modern alternative)
- Consider latest versions of all deps

---

### Phase 4: Testing

**4.1 Update Jest Configuration**

For ESM support in Jest:

```json
{
  "jest": {
    "preset": "ts-jest/presets/default-esm",
    "extensionsToTreatAsEsm": [".ts"],
    "moduleNameMapper": {
      "^(\\.{1,2}/.*)\\.js$": "$1"
    },
    "transform": {
      "^.+\\.ts$": ["ts-jest", {
        "useESM": true,
        "tsconfig": "tsconfig.esm.json"
      }]
    }
  }
}
```

**4.2 Test Both Module Formats**

Create tests that verify both ESM and CJS work:

```javascript
// test/module-formats.test.ts
describe('Module Formats', () => {
  test('ESM import works', async () => {
    const { arkit } = await import('../dist/esm/index.js');
    expect(typeof arkit).toBe('function');
  });
  
  test('CJS require works', () => {
    const { arkit } = require('../dist/cjs/index.cjs');
    expect(typeof arkit).toBe('function');
  });
});
```

**4.3 Test CLI in both modes**

Verify the CLI binary works:
```bash
./bin/arkit.js --help
node --input-type=module ./bin/arkit.js --help
node --input-type=commonjs ./bin/arkit.js --help  # Should fail gracefully
```

---

### Phase 5: Documentation Updates

**5.1 README.md**

Add note about ESM:
```markdown
## Installation

```bash
npm install arkit --save-dev
```

Arkit supports both ESM and CommonJS:

**ESM (Recommended):**
```javascript
import { arkit } from 'arkit';

await arkit({
  directory: './src',
  output: 'architecture.svg'
});
```

**CommonJS (Legacy):**
```javascript
const { arkit } = require('arkit');

arkit({
  directory: './src',
  output: 'architecture.svg'
}).then(console.log);
```
```

**5.2 CLAUDE.md**

Update architecture section:
- Note dual-package setup
- Explain ESM as primary, CJS as compatibility layer
- Document build process

**5.3 Migration Guide**

Create `MIGRATION_GUIDE_v2.md` for users upgrading:
- How to migrate from CJS imports
- Breaking changes (if any)
- New features available with ESM

---

## Rollout Plan

### Step 1: Development (1-2 weeks)

1. Create feature branch: `feature/esm-migration`
2. Implement Phase 1-2 (source + build)
3. Verify dual builds work
4. Test locally with both module formats

### Step 2: Testing (1 week)

1. Implement Phase 3-4 (deps + tests)
2. Update CI to test both ESM and CJS outputs
3. Test in sample projects (both ESM and CJS)
4. Check compatibility with Node 16, 18, 20, 22

### Step 3: Documentation (3-5 days)

1. Update all docs (Phase 5)
2. Write migration guide
3. Update examples in repo

### Step 4: Beta Release

1. Release as `arkit@2.0.0-beta.1`
2. Ask community to test
3. Collect feedback on GitHub
4. Fix issues

### Step 5: Stable Release

1. Release `arkit@2.0.0`
2. Announce on GitHub, npm, social media
3. Monitor issues for 2-4 weeks
4. Patch any compatibility issues

---

## Breaking Changes to Consider

### Major Version: v2.0.0

**Required:**
- Minimum Node.js version: 16+ (from 12+)
- `yargs` upgraded to v18+ (affects CLI API slightly)

**Optional Breaking Changes to Bundle:**
- Remove deprecated options/features
- Rename confusing config options
- Modernize default behavior

**Non-Breaking (Backwards Compatible):**
- ESM/CJS dual package
- All existing code works with require()
- CLI remains compatible

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| CJS output doesn't work | High | Thorough testing, keep v1.x available |
| ESM output doesn't work | High | Test in multiple environments |
| CLI breaks | High | Test with both module loaders |
| Dependency issues | Medium | Gradual upgrade, test each |
| Community backlash | Medium | Clear docs, beta period, support |
| Build complexity | Low | Document build process clearly |

---

## Success Criteria

✅ **Technical:**
- Both ESM and CJS imports work
- All 19+ tests pass
- CLI works in all scenarios
- No performance regression
- CI passes on Node 16, 18, 20, 22

✅ **User Experience:**
- Existing code doesn't break
- Clear migration path
- Better developer experience
- Access to modern dependencies

✅ **Documentation:**
- Updated README
- Migration guide exists
- Examples for both formats
- Clear breaking changes documented

---

## Timeline Estimate

| Phase | Duration | Effort |
|-------|----------|--------|
| Source Migration | 3-5 days | High |
| CLI Rewrite | 2-3 days | Medium |
| Testing Setup | 2-3 days | Medium |
| Dual Build Config | 1-2 days | Medium |
| Dependency Updates | 1-2 days | Low |
| Documentation | 3-5 days | Medium |
| Testing & QA | 5-7 days | High |
| **Total** | **3-4 weeks** | |

---

## Alternative: ESM-Only (v3.0 consideration)

If user base supports it, eventually drop CJS entirely:

**Benefits:**
- Simpler build process
- Smaller package size
- Modern tooling access
- Less maintenance

**Timeline:**
- Not before 2026
- After v2.0 has been stable for 6+ months
- When Node 16+ adoption is high (>95%)
- Survey users first

---

## Reference Links

- [Node.js ESM Documentation](https://nodejs.org/api/esm.html)
- [TypeScript Handbook: Modules](https://www.typescriptlang.org/docs/handbook/modules.html)
- [Dual Package Hazard](https://nodejs.org/api/packages.html#dual-commonjses-module-packages)
- [Pure ESM Package Guide](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c)
- [yargs v18 ESM Support](https://github.com/yargs/yargs/issues/1929)

---

## Notes

**Why Dual Package?**
- Large user base on CommonJS
- Breaking everyone's code is bad UX
- Gradual migration is safer
- Industry standard approach (see: `chalk`, `got`, etc.)

**Why Not Pure ESM Now?**
- Too disruptive for existing users
- Requires Node 16+ (many still on 14)
- CJS still widely used
- Can do pure ESM in v3.0 later

**Current Blocker Resolved:**
- This PR stays on CommonJS + yargs v17
- Gets local PlantUML + WASM shipped
- ESM can be tackled properly in v2.0

---

## Action Items for ESM Migration

When ready to start:

- [ ] Create `feature/esm-migration` branch
- [ ] Update `package.json` with exports
- [ ] Convert source files to ESM syntax
- [ ] Create dual TypeScript configs
- [ ] Update build scripts
- [ ] Rewrite CLI entry point
- [ ] Upgrade yargs to v18+
- [ ] Update Jest for ESM
- [ ] Test both module formats
- [ ] Update all documentation
- [ ] Create migration guide
- [ ] Beta release
- [ ] Collect feedback
- [ ] Stable v2.0.0 release

---

**Status:** 📋 Planning Phase  
**Target:** Q1-Q2 2026  
**Owner:** TBD  
**Related:** Issue #XXX (to be created)
