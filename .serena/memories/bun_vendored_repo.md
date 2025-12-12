# Bun Vendored Repository (./bun/)

## Overview

**Location**: `./bun/` (project root)  
**Status**: Gitignored (not committed to repository)  
**Content**: Complete Bun source code repository clone

## Purpose

1. **Test Synchronization**: Source for `bun run sync-tests` command in
   api-tracker
   - Tests are copied from `./bun/test/js/bun/` to `packages/api-tracker/tests/`
   - Ensures polyfill tests match Bun's official test suite

2. **Reference Implementation**: Understanding how Bun implements APIs
   - Source code in `./bun/src/`
   - Native implementations for comparison with polyfills

3. **Type Definitions**: Resolution chain for @types/bun
   - `@types/bun` → `./bun/packages/bun-types/`
   - API tracker parses these .d.ts files for coverage analysis

4. **Development Aid**: Local reference for API behavior and edge cases

## Structure

```
./bun/
├── test/js/bun/           # Official Bun API tests (synced to api-tracker/tests/)
├── src/                   # Bun runtime source (Zig, C++, JavaScript)
├── packages/
│   └── bun-types/         # TypeScript type definitions
├── benchmark/             # Performance benchmarks
└── ...                    # Full Bun repository structure
```

## Commands Using This Directory

### API Tracker Test Sync

```bash
bun run sync-tests     # Copies tests from ./bun/test/ to api-tracker/tests/
bun run sync-tests:dry # Preview what would be copied
```

### Type Resolution

API tracker automatically resolves:

```
@types/bun (npm package)
  ↓
./bun/packages/bun-types/ (vendored)
  ↓
Parse .d.ts files for API extraction
```

## Maintenance

- **Not in Git**: Directory is gitignored, each developer maintains their own
  clone
- **Manual Clone**: Clone Bun repository to `./bun/` if needed for development
- **Version Sync**: Should match @types/bun version in catalog (~1.3)
- **Update Frequency**: Update when syncing tests or when Bun version changes

## Important Notes

- This directory is **optional** for basic polyfill development
- **Required** for test synchronization and comprehensive API coverage analysis
- **Do not commit** - remains local to development environment
- **Large directory** - full Bun source code (100MB+)
