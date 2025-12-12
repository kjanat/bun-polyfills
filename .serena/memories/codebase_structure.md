# Codebase Structure

## Root Structure

```
bun-polyfills/
├── package.json           # Workspace config + shared catalog
├── bun.lock               # Lock file
├── biome.jsonc            # Biome linter/formatter config
├── .gitignore             # Git ignore patterns
├── README.md              # User-facing documentation
├── AGENTS.md              # Detailed project/architecture documentation
├── LICENSE                # GPL-3.0-only
├── packages/              # Workspace packages
│   ├── polyfills/         # Core polyfill implementations
│   ├── plugin/            # Bun build plugin
│   ├── api-tracker/       # Coverage tracking tool
│   └── tsconfig/          # Shared TypeScript config
├── node_modules/          # Dependencies
├── bun/                   # Vendored Bun repository (for test syncing)
├── debug/                 # Debug artifacts
└── .serena/               # Serena MCP memory storage
```

## Package: @kjanat/bun-polyfills (packages/polyfills/)

```
polyfills/
├── package.json           # Package manifest
├── tsconfig.json          # TypeScript config (extends workspace)
├── tsdown.config.ts       # Bundler configuration
├── src/
│   ├── index.ts           # Main entry: initBunShims(), exports all polyfills
│   ├── file.ts            # Bun.file(), Bun.write(), BunFile, FileSink
│   ├── shell.ts           # Bun.$ (wraps zx)
│   ├── spawn.ts           # Bun.spawn(), Bun.spawnSync() (wraps node:child_process)
│   ├── env.ts             # Bun.env, Bun.version, Bun.revision
│   ├── modules.ts         # Bun.resolve(), pathToFileURL(), fileURLToPath()
│   ├── glob.ts            # Bun.Glob (wraps tinyglobby)
│   ├── compression.ts     # Compression APIs (gzip, deflate, etc.)
│   ├── crypto.ts          # Crypto utilities (Bun.hash, Bun.password)
│   ├── toml.ts            # TOML parsing (wraps smol-toml)
│   ├── process.ts         # Process-related APIs
│   ├── types.ts           # Shared type definitions
│   └── utils.ts           # Utility functions
└── dist/                  # Build output (gitignored)
    ├── index.mjs          # Bundled main entry
    ├── index.d.mts        # Type declarations
    └── *.mjs/*.d.mts      # Individual module outputs
```

## Package: @kjanat/bun-api-tracker (packages/api-tracker/)

```
api-tracker/
├── package.json           # Package manifest
├── tsconfig.json          # TypeScript config
├── tsdown.config.ts       # Bundler configuration
├── src/
│   ├── index.ts           # Programmatic API
│   ├── cli.ts             # CLI entry: report, check, badge, list, extract, sync-tests
│   ├── extractor.ts       # Parses @types/bun .d.ts files with TS Compiler API
│   ├── detector.ts        # Scans polyfills/ for implementations
│   ├── reporter.ts        # Generates JSON/Markdown coverage reports
│   ├── badge.ts           # Generates shields.io badge JSON
│   ├── types.ts           # Type definitions for tracker
│   └── utils/             # Utility modules
├── data/
│   └── manual-overrides.json  # Manual API status overrides
├── output/                # Generated reports (committed to Git)
│   ├── coverage.json      # Full coverage data
│   ├── COVERAGE.md        # Human-readable report
│   └── badge.json         # Shields.io endpoint badge
├── tests/                 # Synced test files from bun repo
│   ├── file/              # File API tests
│   ├── spawn/             # Spawn API tests
│   ├── shell/             # Shell API tests
│   └── ...                # Other test categories
└── dist/                  # Build output (gitignored)
```

## Package: @kjanat/bun-polyfills-plugin (packages/plugin/)

```
plugin/
├── package.json           # Package manifest
├── tsconfig.json          # TypeScript config
├── tsdown.config.ts       # Bundler configuration
├── src/
│   └── index.ts           # conditionalPolyfillPlugin implementation
└── dist/                  # Build output (gitignored)
```

## Package: @kjanat/bun-polyfills-tsconfig (packages/tsconfig/)

```
tsconfig/
├── package.json           # Package manifest
└── tsconfig.json          # Shared TypeScript base configuration
```

## Vendored: bun/ (Bun Repository) - GITIGNORED

**IMPORTANT**: `./bun/` is a gitignored directory in project root containing the
complete Bun source code repository.

```
bun/                       # Full Bun repository clone (GITIGNORED)
├── test/                  # Test files synced to api-tracker/tests/
│   └── js/
│       └── bun/           # Bun API tests (source for test syncing)
├── src/                   # Bun source code
├── packages/              # Bun packages (bun-types, etc.)
└── ...                    # Complete Bun repository
```

**Purpose**:

- Test synchronization source for api-tracker (`bun run sync-tests`)
- Reference implementation for understanding Bun APIs
- Type definition source (@types/bun → bun-types resolution)
- Not committed to Git (local development only)

## Key Files

- **package.json (root)**: Workspace config, shared catalog, root scripts, git
  hooks
- **biome.jsonc**: Linter rules, formatter settings, overrides
- **packages/tsconfig/tsconfig.json**: Shared TS config (strict, bundler mode,
  ESNext)
- **AGENTS.md**: Comprehensive project documentation for agents/LLMs
- **README.md**: User-facing quick start and package descriptions
