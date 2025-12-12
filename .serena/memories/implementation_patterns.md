# Implementation Patterns

## Polyfill Architecture

### Core Pattern: Wrapper Classes

Polyfills implement Bun's TypeScript interfaces using Node.js APIs. Each
polyfill wraps native Node.js functionality to match Bun's API surface.

```typescript
// Pattern: Implement Bun interface with Node.js backend
import type { BunFile } from "@types/bun";
import { readFile } from "node:fs/promises";

class PolyfillBunFile implements BunFile {
  readonly name: string;

  constructor(path: PathLike) {
    this.name = String(path);
  }

  async text(): Promise<string> {
    return readFile(this.name, "utf-8"); // Node.js API
  }

  // ... other BunFile interface methods
}
```

## Specific Polyfill Patterns

### 1. File API (file.ts)

**Backend**: `node:fs/promises`, `node:fs`, `node:stream`  
**Pattern**: Class-based wrappers for BunFile, FileSink

```typescript
// BunFile: Lazy file handle with async read methods
class PolyfillBunFile implements BunFile {
  async text(): Promise<string> {
    /* readFile */
  }
  async arrayBuffer(): Promise<ArrayBuffer> {
    /* readFile + Buffer.from */
  }
  stream(): ReadableStream {
    /* fs.createReadStream + conversion */
  }
}

// FileSink: Writable stream wrapper
class PolyfillFileSink extends Writable implements FileSink {
  write(chunk: BlobPart): number {
    /* this.write() */
  }
  flush(): void {
    /* this.cork/uncork */
  }
}

// Bun.file(): Factory function
export function file(path: PathLike): BunFile {
  return new PolyfillBunFile(path);
}
```

### 2. Shell API (shell.ts)

**Backend**: `zx` library  
**Pattern**: Template literal tag function wrapper

```typescript
import { $ as zx$ } from "zx";

// Bun.$: Returns ShellPromise (Bun interface)
export function $(
  strings: TemplateStringsArray,
  ...values: unknown[]
): ShellPromise {
  const zxPromise = zx$(strings, ...values); // zx backend

  // Wrap zx result to match Bun's ShellPromise interface
  return Object.assign(zxPromise, {
    text: () => zxPromise.then((r) => r.stdout),
    json: () => zxPromise.then((r) => JSON.parse(r.stdout)),
    // ... other ShellPromise methods
  });
}
```

### 3. Spawn API (spawn.ts)

**Backend**: `node:child_process`  
**Pattern**: Subprocess wrapper class

```typescript
import { spawn as nodeSpawn } from "node:child_process";

// Bun.spawn(): Returns Subprocess
export function spawn(cmd: string[], options?: SpawnOptions): Subprocess {
  const proc = nodeSpawn(cmd[0], cmd.slice(1), {
    stdio: options?.stdio || "inherit",
    env: options?.env,
    cwd: options?.cwd,
  });

  // Wrap node ChildProcess to match Bun Subprocess interface
  return {
    pid: proc.pid!,
    stdin: proc.stdin,
    stdout: proc.stdout,
    stderr: proc.stderr,
    exited: new Promise((resolve) => proc.on("exit", resolve)),
    kill: (signal) => proc.kill(signal),
    // ... other Subprocess interface methods
  };
}
```

### 4. Environment API (env.ts)

**Backend**: `node:process`  
**Pattern**: Direct property mapping

```typescript
// Bun.env: Map to process.env
export const env = process.env;

// Bun.version: Static version string
export const version = "1.0.0-polyfill";

// Bun.revision: Git commit hash
export const revision = "polyfill";
```

### 5. Module Resolution (modules.ts)

**Backend**: `node:url`, `node:module`  
**Pattern**: Function wrappers

```typescript
import {
  pathToFileURL as nodePathToFileURL,
  fileURLToPath as nodeFileURLToPath,
} from "node:url";
import { createRequire } from "node:module";

export function resolve(specifier: string, from?: string): string {
  const require = createRequire(from || import.meta.url);
  return require.resolve(specifier); // Node.js resolution
}

export const pathToFileURL = nodePathToFileURL;
export const fileURLToPath = nodeFileURLToPath;
```

### 6. Glob API (glob.ts)

**Backend**: `tinyglobby`  
**Pattern**: Class wrapper for Glob interface

```typescript
import { glob as tinyglobGlob } from "tinyglobby";

class PolyfillGlob implements Glob {
  scan(pattern: string): AsyncIterableIterator<string> {
    return tinyglobGlob(pattern, { onlyFiles: true })[Symbol.asyncIterator]();
  }
}

export const Glob = PolyfillGlob;
```

## Initialization Pattern

### initBunShims()

Central initialization function that injects polyfills into global scope:

```typescript
export async function initBunShims(): Promise<void> {
  // Only run in Node.js, skip in Bun
  if (typeof Bun !== "undefined") return;

  // Inject global Bun namespace
  (globalThis as any).Bun = {
    file,
    write,
    $,
    spawn,
    spawnSync,
    env,
    version,
    revision,
    resolve,
    resolveSync,
    pathToFileURL,
    fileURLToPath,
    Glob,
    // ... other APIs
  };
}
```

## Build Plugin Pattern (plugin/)

### conditionalPolyfillPlugin

Stubs polyfills when targeting Bun to avoid bundling unnecessary code:

```typescript
import type { BunPlugin } from "bun";

export const conditionalPolyfillPlugin: BunPlugin = {
  name: "conditional-polyfill",
  setup(build) {
    if (build.config.target === "bun") {
      // Stub @kjanat/bun-polyfills imports
      build.onResolve({ filter: /@kjanat\/bun-polyfills/ }, () => ({
        path: "stub",
        namespace: "polyfill-stub",
      }));

      build.onLoad({ filter: /.*/, namespace: "polyfill-stub" }, () => ({
        contents: "export const initBunShims = () => {};",
      }));
    }
  },
};
```

## API Tracker Pattern (api-tracker/)

### Extraction → Detection → Reporting Pipeline

```typescript
// 1. Extract APIs from @types/bun
const apis = extractBunAPIs(); // Uses TS Compiler API to parse .d.ts

// 2. Detect implementations in polyfills/
const implementations = detectImplementations(); // Scans src/*.ts for symbols

// 3. Match and generate report
const coverage = matchAPIsWithImplementations(apis, implementations);

// 4. Output reports
writeJSON("coverage.json", coverage);
writeMd("COVERAGE.md", coverage);
writeBadge("badge.json", coverage);
```

## Design Principles

1. **Interface Fidelity**: Match Bun's TypeScript interfaces exactly
2. **Backend Abstraction**: Use best Node.js equivalent (zx for shell,
   node:child_process for spawn)
3. **Lazy Initialization**: Only polyfill when `initBunShims()` is called
4. **Conditional Bundling**: Plugin stubs polyfills for Bun target
5. **Type Safety**: Leverage @types/bun for compile-time correctness
6. **Coverage Tracking**: Automated detection via TypeScript AST analysis
