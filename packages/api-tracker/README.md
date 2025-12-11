# @kjanat/bun-api-tracker

Automated Bun API detection and coverage tracking for the
`@kjanat/bun-polyfills` project.

## Purpose

`bun-api-tracker` extracts all APIs from `@types/bun`, detects which ones are
implemented in the polyfills package, and generates comprehensive coverage
reports. It powers the automated tracking of polyfill completeness across 450+
Bun APIs.

## Features

- **API Extraction**: Parses `@types/bun` TypeScript declarations to discover
  all Bun APIs
- **Implementation Detection**: Scans polyfill source code to identify
  implemented APIs
- **Type Comparison**: Compares type signatures between Bun and polyfill
  implementations
- **Coverage Reports**: Generates JSON and Markdown reports with detailed
  statistics
- **Badge Generation**: Creates shields.io-compatible badge JSON for README
  badges
- **Manual Overrides**: Supports manual annotations for APIs that can't be
  auto-detected
- **Test Syncing**: Syncs official Bun tests for polyfill validation
- **Test Runner**: Executes synced tests to verify polyfill behavior

## Installation

```bash
bun install
```

## Usage

### Generate Coverage Report (Default)

```bash
bun run --filter @kjanat/bun-api-tracker report
```

Generates:

- `output/coverage.json` - Full coverage data in JSON format
- `output/COVERAGE.md` - Human-readable Markdown report

### Compare Type Signatures

```bash
bun run compare
```

Compares Bun's type signatures against polyfill implementations and outputs
mismatches.

### Check Coverage Threshold

```bash
bun run check --min-coverage 10
```

Exits with code 1 if coverage is below the threshold (used in CI).

### Generate Badge JSON

```bash
bun run badge
```

Creates `output/badge.json` for shields.io endpoint badges.

### List All APIs

```bash
bun run src/cli.ts list [--category [--module < name > ] < name > ]
```

Lists all discovered Bun APIs, optionally filtered by category or module.

### Extract APIs (Debug)

```bash
bun run src/cli.ts extract
```

Extracts and displays all APIs from `@types/bun` (useful for debugging the
extractor).

### Sync Official Bun Tests

```bash
bun run sync-tests [--dry-run]
```

Syncs test files from Bun's official repository for polyfill validation.

### Run Tests

```bash
bun test
```

Runs both unit tests (in `src/`) and integration tests (in `tests/`).

## CLI Options

| Option               | Description                                                      |
| -------------------- | ---------------------------------------------------------------- |
| `--polyfills <path>` | Path to polyfills source directory (default: `../polyfills/src`) |
| `--output <path>`    | Output directory for reports (default: `./output`)               |
| `--min-coverage <n>` | Minimum coverage percentage for `check` command                  |
| `--json`             | Output JSON only                                                 |
| `--markdown`         | Output Markdown only                                             |
| `--category <name>`  | Filter by category (filesystem, crypto, etc.)                    |
| `--module <name>`    | Filter by module (bun, bun:sqlite, etc.)                         |
| `--dry-run`          | For `sync-tests`: show what would be done without making changes |
| `--filter <pattern>` | For `run-tests`: filter tests by pattern                         |

## Output Files

All output files are written to `packages/api-tracker/output/`:

| File                     | Description                                                                    |
| ------------------------ | ------------------------------------------------------------------------------ |
| `coverage.json`          | Complete coverage data with API details, implementation status, and statistics |
| `COVERAGE.md`            | Human-readable Markdown report organized by category                           |
| `badge.json`             | Shields.io endpoint JSON for README badges                                     |
| `comparison.json`        | Type signature comparison results between Bun and polyfills                    |
| `combined-coverage.json` | Three-tier verification (types + tests + annotations)                          |

## Manual Overrides

For APIs that can't be auto-detected (e.g., partial implementations, renamed
functions), add entries to `data/manual-overrides.json`:

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

**Status values**: `implemented`, `partial`, `stub`, `not-started`

## Project Structure

```
packages/api-tracker/
├── data/
│   ├── annotations.json       # Test-based annotations
│   └── manual-overrides.json  # Manual API status overrides
├── output/                    # Generated reports (gitignored)
│   ├── coverage.json
│   ├── COVERAGE.md
│   ├── badge.json
│   ├── comparison.json
│   └── combined-coverage.json
├── src/
│   ├── cli.ts                 # CLI entry point
│   ├── extractor.ts           # TypeScript AST parser for @types/bun
│   ├── detector.ts            # Polyfill implementation scanner
│   ├── comparator.ts          # Type signature comparison
│   ├── reporter.ts            # Coverage report generator
│   ├── badge.ts               # Badge JSON generator
│   ├── test-runner.ts         # Test execution and verification
│   ├── test-sync.ts           # Bun test syncing
│   └── types.ts               # Shared type definitions
└── tests/                     # Integration tests (synced from Bun)
    ├── crypto/
    ├── file/
    ├── shell/
    ├── spawn/
    └── util/
```

## Testing

- **Unit tests**: Colocated with source files in `src/*.test.ts` - test
  individual functions and helpers
- **Integration tests**: In `tests/` - end-to-end tests that verify polyfill
  behavior against Bun's official test suite

Run all tests:

```bash
bun test
```

## Requirements

- **Runtime**: Node.js ≥22 or Bun ≥1.3.4
- **Dependencies**: `@types/bun`, `typescript`, `@kjanat/bun-polyfills`

## Notes

- Always uses `@types/bun` (not `bun-types` directly) - the tracker resolves
  through the @types package
- Category inference uses `Object.hasOwnProperty` to avoid prototype chain
  pollution
- Coverage percentages weight partial implementations as 50% complete
- The tracker is monorepo-aware and resolves workspace dependencies correctly

## License

GPL-3.0-only
