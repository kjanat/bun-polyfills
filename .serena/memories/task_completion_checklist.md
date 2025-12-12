# Task Completion Checklist

When completing a task in this project, execute the following steps:

## 1. Code Quality

### Linting

```bash
bun run lint # Auto-fix lint issues with Biome
# OR for specific package:
bun run --filter @kjanat/PACKAGE_NAME lint
```

**Requirements**:

- No Biome errors or warnings
- Imports auto-organized
- Code follows recommended rules

### Type Checking

```bash
bun run typecheck # Check all packages
# OR for specific package:
bun run --filter @kjanat/PACKAGE_NAME typecheck
```

**Requirements**:

- No TypeScript errors
- Strict mode compliance
- No `any` types without justification

### Formatting

```bash
bun run fmt # Format with Prettier (non-code files)
```

**Requirements**:

- Consistent formatting
- Biome handles code formatting (via lint command)

## 2. Testing

```bash
bun run test # Run all tests
# OR for specific package:
bun run --filter @kjanat/PACKAGE_NAME test
```

**Requirements**:

- All tests passing
- New features have tests
- Edge cases covered

## 3. Build Verification

```bash
bun run build # Build all packages
# OR for specific package:
bun run --filter @kjanat/PACKAGE_NAME build
```

**Requirements**:

- Clean build (no errors)
- dist/ directory generated
- Type declarations (.d.ts) present

## 4. Coverage Update (If Polyfill Changed)

```bash
bun run coverage       # Update API coverage report
bun run coverage:check # Validate coverage threshold
bun run coverage:badge # Update badge.json
```

**Requirements**:

- coverage.json updated
- COVERAGE.md reflects changes
- badge.json current (for README badge)

## 5. Package Validation (If Package Changed)

```bash
# In the specific package directory:
bunx publint
```

**Requirements**:

- No publint errors
- Exports correctly configured
- Package.json valid

## 6. Git Workflow

### Before Commit

```bash
git status # Verify changed files
git diff   # Review changes
```

### Commit

```bash
git add .                         # Stage changes
git commit -m "type: description" # Commit (triggers pre-commit hook)
```

**Pre-commit Hook Auto-Runs**:

- `pretty-quick --staged` (format staged files)
- `bun run coverage` (update coverage)
- Auto-stages `packages/api-tracker/output/`

### Before Push

```bash
git push # Triggers pre-push hook
```

**Pre-push Hook Auto-Runs**:

- `bun run test` (all tests must pass)
- `bun run typecheck` (no type errors)

## 7. Documentation Updates

**If Public API Changed**:

- Update JSDoc comments
- Update README.md if needed
- Update AGENTS.md if architecture changed

**If Coverage Changed**:

- Review `packages/api-tracker/output/COVERAGE.md`
- Verify badge reflects current coverage

## Quick Completion Command Sequence

```bash
# Standard completion workflow:
bun run lint && bun run typecheck && bun run test && bun run build

# With coverage update:
bun run lint && bun run typecheck && bun run test && bun run build && bun run coverage

# Git commit (hooks handle formatting + coverage):
git add . && git commit -m "feat: description"

# Git push (hooks handle test + typecheck):
git push
```

## Failure Recovery

**If lint fails**: Review errors, fix manually or run `bun run lint` again for
auto-fix  
**If typecheck fails**: Fix type errors, no auto-fix available  
**If tests fail**: Debug failing tests, never skip or disable tests  
**If build fails**: Check bundler errors, verify imports and exports  
**If hooks fail**: Fix issues before retrying commit/push, never skip hooks
