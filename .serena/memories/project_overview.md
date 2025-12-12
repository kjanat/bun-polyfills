# Project Overview

**Project Name**: bun-polyfills  
**Type**: Bun workspace monorepo  
**Purpose**: Node.js polyfills for Bun-specific APIs - enables Bun code to run
on Node.js

## Core Concept

Provides runtime compatibility layer allowing Bun APIs (Bun.file(), Bun.$,
Bun.spawn(), etc.) to work in Node.js environments. Uses native Node.js APIs and
libraries (zx, node:fs, node:child_process) to implement Bun's interfaces.

## Packages (3)

1. **@kjanat/bun-polyfills** (`packages/polyfills/`)
   - Core polyfill implementations
   - APIs: file, shell, spawn, env, modules, compression, crypto, glob, toml
   - Target: Node.js runtime

2. **@kjanat/bun-polyfills-plugin** (`packages/plugin/`)
   - Bun build plugin to stub polyfills for bun target
   - Prevents bundling polyfills when building for Bun

3. **@kjanat/bun-api-tracker** (`packages/api-tracker/`)
   - Automated API coverage tracking against @types/bun
   - Generates coverage reports, badges, and statistics
   - CLI tool for analysis and reporting

## Key Features

- ~3% Bun API coverage currently implemented
- ESM-only codebase
- Node.js >= 22 required
- GPL-3.0-only license
- Automated coverage tracking via TypeScript Compiler API
