# Dependency Catalog System

## Catalog Pattern

Root `package.json` defines shared dependency versions via `catalog:` and
`catalogs:` fields. Packages reference catalog versions using
`"dependency": "catalog:"` or `"dependency": "catalog:category"`.

## Main Catalog (catalog)

```json
{
  "@types/bun": "~1.3",
  "@types/node": "^22",
  "@typescript/native-preview": "latest",
  "typescript": "~5.8",
  "zx": "~8.6",
  "prettier": "latest",
  "@kjanat/prettier-config": "latest"
}
```

**Usage in packages**: `"@types/bun": "catalog:"`

## Named Catalogs (catalogs)

### test

```json
{ "string-width": "^8.1.0", "strip-ansi": "^7.1.2" }
```

**Usage**: `"string-width": "catalog:test"`

### lint

```json
{ "@biomejs/biome": "2.3.8" }
```

**Usage**: `"@biomejs/biome": "catalog:lint"`

### bundler

```json
{ "tsdown": "^0.17.2", "@arethetypeswrong/core": "^0.18.2" }
```

**Usage**: `"tsdown": "catalog:bundler"`

## Key Dependencies

### Runtime Dependencies

**polyfills/**

- `zx: catalog:` - Shell execution backend for Bun.$
- `tinyglobby: ^0.2.15` - Glob pattern matching for Bun.Glob
- `minimatch: ^10.1.1` - Pattern matching utilities
- `smol-toml: ^1.5.2` - TOML parsing for Bun.TOML

**api-tracker/**

- `@kjanat/bun-polyfills: workspace:*` - Internal dependency
- `typescript: catalog:` - TS Compiler API for .d.ts parsing

### Development Dependencies (Common)

- `@biomejs/biome: catalog:lint` - Linting and code analysis
- `@types/bun: catalog:` - Bun type definitions
- `@types/node: catalog:` - Node.js type definitions
- `@typescript/native-preview: catalog:` - Latest TS features
- `typescript: catalog:` - TypeScript compiler
- `tsdown: catalog:bundler` - Modern TypeScript bundler

### Build Tools

- `@arethetypeswrong/core: catalog:bundler` - Validate package exports
- `publint` - Package.json linting (via bunx, not installed)

### Formatting

- `prettier: latest` (root) - Code formatter
- `@kjanat/prettier-config: latest` - Shared Prettier config
- `prettier-plugin-*` - Various language plugins (XML, Prisma, sh, nginx, etc.)
- `pretty-quick: ^4.2.2` - Format staged files in git hooks

### Git Hooks

- `simple-git-hooks: ^2.13.1` - Git hook management

## Important Notes

### @types/bun vs bun-types

**CRITICAL**: Always use `@types/bun`, never `bun-types` directly.

- `@types/bun` is the official DefinitelyTyped package
- `@types/bun` re-exports `bun-types` as a dependency
- API tracker resolves `@types/bun` → `bun-types` automatically
- Declaring both causes conflicts

### Workspace Dependencies

Use `workspace:*` for internal packages:

```json
{
  "@kjanat/bun-polyfills": "workspace:*",
  "@kjanat/bun-polyfills-tsconfig": "workspace:*"
}
```

### Peer Dependencies

Packages declare `@types/bun` as optional peer dependency:

```json
{
  "peerDependencies": { "@types/bun": "catalog:" },
  "peerDependenciesMeta": { "@types/bun": { "optional": true } }
}
```

## Version Pinning Strategy

- **Exact pinning**: Biome (`2.3.8`) for consistency
- **Caret ranges**: Libraries with stable APIs (`^10.1.1`)
- **Tilde ranges**: TypeScript, Bun types (`~5.8`, `~1.3`) - patch updates only
- **Latest**: Prettier config (`latest`) - always use newest
