# Tech Stack

## Runtime & Tooling

- **Package Manager**: Bun 1.3.4 (required)
- **Node.js**: >= 22 (target runtime for polyfills)
- **Module System**: ESM only (`"type": "module"`)
- **Workspace**: Bun workspaces with shared catalog

## Languages & Build

- **TypeScript**: 5.8.x (catalog)
- **Compiler**: tsgo (TypeScript + Go for typechecking)
- **Bundler**: tsdown (primary), bun build (legacy)
- **Target**: ESNext (lib, module, target)

## Core Dependencies

- **zx**: ~8.6 - Shell execution backend for Bun.$
- **tinyglobby**: 0.2.15 - Glob pattern matching for Bun.Glob
- **minimatch**: 10.1.1 - Pattern matching utilities
- **smol-toml**: 1.5.2 - TOML parsing for Bun.TOML

## Type System

- **@types/bun**: ~1.3 (catalog, peer dep) - Official Bun type definitions
- **@types/node**: ^22 (catalog) - Node.js types
- **@typescript/native-preview**: latest (catalog) - Native TypeScript features

## Development Tools

- **Linter**: Biome 2.3.8 (catalog:lint) - Fast linting and formatting
- **Formatter**: Prettier ^3.7.4 (disabled in favor of Biome for code, used for
  other files)
- **Test Runner**: bun:test (native Bun test framework)
- **Git Hooks**: simple-git-hooks ^2.13.1
- **Bundle Analyzer**: @arethetypeswrong/core ^0.18.2

## API Tracker Specific

- **TypeScript Compiler API**: For parsing @types/bun declaration files
- **react**: ^19.2.1 (dev dependency for UI components in reports)
- **string-width**, **strip-ansi**: Terminal output formatting
