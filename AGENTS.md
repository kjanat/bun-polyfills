# bun-polyfills Monorepo

## Project Overview

This monorepo provides Node.js polyfills for Bun-specific APIs, enabling Bun
code to run on Node.js. It uses Bun workspaces with a shared dependency catalog.

## Packages

| Package                        | Path                   | Purpose                                                        |
| ------------------------------ | ---------------------- | -------------------------------------------------------------- |
| `@kjanat/bun-polyfills`        | `packages/polyfills`   | Core polyfills for Bun APIs (file, shell, spawn, env, modules) |
| `@kjanat/bun-polyfills-plugin` | `packages/plugin`      | Bun build plugin to stub polyfills when targeting Bun          |
| `@kjanat/bun-api-tracker`      | `packages/api-tracker` | Automated API coverage tracking against @types/bun             |

## Monorepo Structure

```tree
bun-polyfills/
├── package.json           # Root workspace config with catalog
├── packages/
│   ├── polyfills/         # Core polyfill implementations
│   │   └── src/
│   │       ├── index.ts   # Main entry, initBunShims()
│   │       ├── file.ts    # Bun.file(), Bun.write(), BunFile, FileSink
│   │       ├── shell.ts   # Bun.$ (uses zx)
│   │       ├── spawn.ts   # Bun.spawn(), Bun.spawnSync()
│   │       ├── env.ts     # Bun.env, Bun.version, Bun.revision
│   │       ├── modules.ts # Bun.resolve(), pathToFileURL(), fileURLToPath()
│   │       └── types.ts   # Shared type definitions
│   ├── plugin/            # Build plugin for dual-target builds
│   └── api-tracker/       # Coverage tracking tool
│       ├── src/
│       │   ├── extractor.ts  # Parses @types/bun .d.ts files
│       │   ├── detector.ts   # Scans polyfills for implementations
│       │   ├── reporter.ts   # Generates JSON/Markdown reports
│       │   ├── badge.ts      # Shields.io badge generation
│       │   └── cli.ts        # CLI: report, check, badge, list, extract
│       └── output/
│           ├── coverage.json
│           ├── COVERAGE.md
│           └── badge.json    # For shields.io endpoint badge
```

## Key Commands

```bash
# Root commands
bun install            # Install all workspace dependencies
bun run build          # Build all packages
bun run test           # Test all packages
bun run typecheck      # Typecheck all packages
bun run coverage       # Generate API coverage report
bun run coverage:badge # Generate badge.json for README

# Package-specific
bun run --filter @kjanat/bun-polyfills build
bun run --filter @kjanat/bun-api-tracker report
```

## Dependency Catalog

Root `package.json` defines shared versions via `catalog:`:

```json
{
  "catalog": {
    "@types/bun": "^1.3.4",
    "@types/node": "^22.15.32",
    "typescript": "^5.8.3",
    "zx": "^8.6.0"
  }
}
```

Packages reference with `"dependency": "catalog:"`.

**Important**: Always use `@types/bun`, never `bun-types` directly:

- `@types/bun` is the official package that re-exports `bun-types`
- `bun-types` is resolved automatically as a dependency of `@types/bun`
- The API tracker resolves through `@types/bun` -> `bun-types` for .d.ts parsing

## API Tracker

The tracker automatically:

1. **Extracts** all Bun APIs from `@types/bun` declaration files using
   TypeScript Compiler API
2. **Detects** implementations by scanning `packages/polyfills/src/*.ts`
3. **Generates** coverage reports and shields.io badge JSON

### Adding New Polyfills

When implementing a new API:

1. Add implementation to appropriate file in `packages/polyfills/src/`
2. Export from `index.ts` and register in `initBunShims()`
3. Run `bun run coverage` to verify detection
4. If not auto-detected, add manual override in
   `packages/api-tracker/data/manual-overrides.json`

### Manual Overrides

For APIs that can't be auto-detected:

```json
{
  "Bun.someApi": {
    "status": "partial",
    "completeness": 50,
    "notes": "Missing X feature",
    "missingFeatures": ["feature1", "feature2"]
  }
}
```

## Polyfill Implementation Patterns

### BunFile Pattern

```typescript
// Create class implementing Bun's BunFile interface
class PolyfillBunFile implements BunFile {
  readonly name: string;
  constructor(path: PathLike) {
    /* ... */
  }
  async text(): Promise<string> {
    /* use node:fs */
  }
  async arrayBuffer(): Promise<ArrayBuffer> {
    /* ... */
  }
  // etc.
}
```

### Shell Pattern (Bun.$)

```typescript
// Uses zx as backend, wraps to match Bun's ShellPromise interface
import { $ as zx$ } from "zx";

export function $(
  strings: TemplateStringsArray,
  ...values: unknown[]
): ShellPromise {
  // Convert zx result to Bun-compatible ShellPromise
}
```

### Spawn Pattern

```typescript
// Uses node:child_process, returns Subprocess matching Bun's interface
import { spawn as nodeSpawn } from "node:child_process";

export function spawn(cmd: string[], options?: SpawnOptions): Subprocess {
  const proc = nodeSpawn(cmd[0], cmd.slice(1) /* ... */);
  // Wrap with Bun-compatible interface
}
```

## Build Configuration

Each package uses:

- `bun build` for bundling (target: node or bun)
- `tsc --emitDeclarationOnly` for type declarations
- ESM only (`"type": "module"`)

Build targets:

- `polyfills`: `--target node` (runs on Node.js)
- `plugin`: `--target bun` (Bun build plugin)
- `api-tracker`: `--target node` (CLI tool)

## Testing

Uses `bun:test`:

```typescript
import { describe, expect, test } from "bun:test";

describe("Bun.file", () => {
  test("reads text", async () => {
    const file = Bun.file("./test.txt");
    expect(await file.text()).toBe("content");
  });
});
```

## Current Coverage

~3% of Bun APIs implemented. See `packages/api-tracker/output/COVERAGE.md` for
details.

### Implemented APIs

- `Bun.file()`, `Bun.write()`, `BunFile`, `FileSink`
- `Bun.$` (shell)
- `Bun.spawn()`, `Bun.spawnSync()`
- `Bun.env`, `Bun.version`, `Bun.revision`
- `Bun.resolve()`, `Bun.resolveSync()`, `Bun.pathToFileURL()`,
  `Bun.fileURLToPath()`

### High Priority TODOs

- `Bun.serve()` - HTTP server
- `Bun.build()` - Bundler
- `bun:sqlite` - SQLite driver
- Compression APIs (gzip, deflate)
- Crypto utilities (Bun.hash, Bun.password)

## Notes

- Node.js >= 22 required (for native fetch, etc.)
- GPL-3.0-only license
- All packages use `packageManager: "bun@1.3.4"`
