# Code Style & Conventions

## TypeScript Configuration

- **Strict Mode**: Enabled (`"strict": true`)
- **Module Resolution**: bundler
- **Module Detection**: force
- **JSX**: react-jsx
- **Additional Strict Flags**:
  - `noFallthroughCasesInSwitch`: true
  - `noUncheckedIndexedAccess`: true (prevents undefined array access)
  - `noImplicitOverride`: true
- **Disabled Strict Flags**:
  - `noUnusedLocals`: false
  - `noUnusedParameters`: false
  - `noPropertyAccessFromIndexSignature`: false

## Biome Linter Rules

- **Quote Style**: Double quotes (`"quoteStyle": "double"`)
- **Indent Style**: Spaces
- **Rules**: Recommended preset enabled
- **Domains**: Project and test domains use "recommended"
- **Auto-fix**: Enabled via `biome check --write`
- **Import Organization**: Auto-organize on save (`"organizeImports": "on"`)
- **Test Overrides**: Non-null assertions allowed in `*.test.ts` files

## File Organization

- **Source Files**: `src/` directory in each package
- **Build Output**: `dist/` directory (excluded from Git, TypeScript, Biome)
- **Tests**: Co-located with source in `src/` or separate test files (`.test.ts`
  suffix)
- **Entry Points**: `index.ts` for main exports

## Naming Conventions

- **Files**: kebab-case or camelCase (e.g., `file.ts`, `shell.ts`,
  `api-tracker/`)
- **Classes**: PascalCase (e.g., `PolyfillBunFile`)
- **Functions**: camelCase (e.g., `initBunShims()`)
- **Constants**: UPPER_SNAKE_CASE for module-level constants
- **Interfaces**: PascalCase, prefix with `I` if needed to avoid conflicts

## Import/Export Patterns

- **ESM Only**: Use `import`/`export`, never `require()`
- **Extension**: `.ts` extensions allowed in imports
  (`allowImportingTsExtensions: true`)
- **Node Built-ins**: Use `node:` prefix (e.g.,
  `import { readFile } from "node:fs/promises"`)
- **Workspace Deps**: `workspace:*` for internal packages

## Comments & Documentation

- **JSDoc**: Use for public APIs and complex logic
- **Inline Comments**: Explain "why", not "what"
- **TODO Comments**: Discouraged; use issue tracker instead

## Test Patterns

- **Framework**: bun:test
- **Structure**: `describe` → `test` → `expect`
- **Naming**: Descriptive test names (e.g., "reads text from file")
- **Async**: Use `async/await` for promises
