# Suggested Commands

## Development Workflow

### Setup & Installation

```bash
bun install # Install all workspace dependencies
```

### Build Commands

```bash
bun run build                                  # Build all packages
bun run clean                                  # Clean all dist/ directories
bun run --filter @kjanat/bun-polyfills build   # Build specific package
bun run --filter @kjanat/bun-api-tracker build # Build api-tracker
```

### Testing

```bash
bun run test                                # Run tests for all packages
bun run --filter @kjanat/bun-polyfills test # Test specific package
AGENT=1 bun run test                        # Run tests with agent flag (from root)
```

### Linting & Formatting

```bash
bun run lint                                # Lint all packages with Biome (auto-fix)
bun run fmt                                 # Format all files with Prettier
bun run --filter @kjanat/bun-polyfills lint # Lint specific package
bunx publint                                # Validate package.json exports (per-package)
```

### Type Checking

```bash
bun run typecheck                                # Typecheck all packages
bun run --filter @kjanat/bun-polyfills typecheck # Check specific package
tsgo --noEmit                                    # Direct typecheck in package dir
```

### API Coverage Tracking

```bash
bun run coverage                                    # Generate coverage report (runs api-tracker report)
bun run coverage:badge                              # Generate badge.json for shields.io
bun run coverage:check                              # Validate coverage meets threshold
bun run --filter @kjanat/bun-api-tracker report     # Direct report command
bun run --filter @kjanat/bun-api-tracker compare    # Compare coverage changes
bun run --filter @kjanat/bun-api-tracker sync-tests # Sync test files from bun repo
```

### Git Workflow

```bash
git status                    # Check current status
git branch                    # List branches
git checkout -b feature/name  # Create feature branch
bun run pretty-quick --staged # Format staged files (pre-commit hook)
git commit -m "message"       # Commit changes (triggers hooks)
git push                      # Push (triggers pre-push hook: test + typecheck)
```

## Per-Package Commands

### In packages/polyfills/

```bash
bun run build        # tsdown bundler
bun run build:legacy # bun build + tsc (alternative)
bun run test         # Run polyfill tests
bun run typecheck    # Type check
bun run lint         # Biome linting
bun run fmt          # Format this package
bun run lint:package # Validate package.json with publint
```

### In packages/api-tracker/

```bash
bun run report         # Generate coverage report
bun run badge          # Generate badge JSON
bun run check          # Check coverage threshold
bun run compare        # Compare coverage changes
bun run sync-tests     # Sync test files from bun repo
bun run sync-tests:dry # Dry-run sync
```

### In packages/plugin/

```bash
bun run build     # Build plugin
bun run test      # Test plugin
bun run typecheck # Type check
```

## Git Hooks (Automated)

### pre-commit

- Runs `pretty-quick --staged` (format staged files)
- Runs `bun run coverage` (update coverage report)
- Auto-stages `packages/api-tracker/output/`

### pre-push

- Runs `bun run test` (all tests)
- Runs `bun run typecheck` (all type checks)

## System Utilities (Linux)

```bash
ls -la              # List files with details
pwd                 # Print working directory
grep -r "pattern" . # Search recursively
find . -name "*.ts" # Find files by pattern
cd path/            # Change directory
cat file.txt        # Display file contents
```
