# @kjanat/bun-polyfills

Bun API polyfills for Node.js runtime.

## Installation

```bash
bun add @kjanat/bun-polyfills
# or
npm install @kjanat/bun-polyfills
```

## Usage

### Initialize All Polyfills

```ts
import { initBunShims } from "@kjanat/bun-polyfills";

await initBunShims();

// Bun APIs now available globally
const file = Bun.file("./data.txt");
console.log(await file.text());
```

### Selective Imports

Import only what you need:

```ts
// Environment variables
import { initEnv } from "@kjanat/bun-polyfills/env";
initEnv();
// Bun.env now available

// File operations
import { initFile } from "@kjanat/bun-polyfills/file";
initFile();
// Bun.file(), Bun.write(), Bun.stdin, Bun.stdout, Bun.stderr

// Shell ($)
import { initShell } from "@kjanat/bun-polyfills/shell";
await initShell();
// Bun.$ now available

// Spawn
import { initSpawn } from "@kjanat/bun-polyfills/spawn";
initSpawn();
// Bun.spawn(), Bun.spawnSync()

// Version info
import { initModules } from "@kjanat/bun-polyfills/modules";
initModules();
// Bun.version, Bun.revision
```

## Supported APIs

### Bun.file(path)

```ts
const file = Bun.file("./package.json");

await file.text(); // string
await file.json(); // parsed JSON
await file.arrayBuffer(); // ArrayBuffer
await file.bytes(); // Uint8Array
file.stream(); // ReadableStream
file.size; // number
file.type; // MIME type
file.name; // file path
```

### Bun.write(path, data)

```ts
await Bun.write("./output.txt", "Hello");
await Bun.write("./data.json", JSON.stringify({ key: "value" }));
await Bun.write("./binary.bin", new Uint8Array([1, 2, 3]));
```

### Bun.$ (Shell)

```ts
// Simple command
await Bun.$`echo "Hello"`;

// With variables (escaped)
const name = "world";
await Bun.$`echo ${name}`;

// Capture output
const result = await Bun.$`ls -la`.text();

// Quiet mode (no output)
await Bun.$`npm install`.quiet();
```

### Bun.spawn()

```ts
const proc = Bun.spawn(["node", "--version"]);
await proc.exited; // exit code

// With options
const proc2 = Bun.spawn(["cat"], {
  stdin: "pipe",
  stdout: "pipe",
});
proc2.stdin.write("Hello");
proc2.stdin.end();
const output = await new Response(proc2.stdout).text();
```

### Bun.spawnSync()

```ts
const result = Bun.spawnSync(["echo", "Hello"]);
console.log(result.stdout.toString()); // "Hello\n"
console.log(result.exitCode); // 0
```

### Bun.env

```ts
Bun.env.MY_VAR = "value";
console.log(Bun.env.PATH);
```

### Bun.stdin / Bun.stdout / Bun.stderr

```ts
const input = await Bun.stdin.text();
await Bun.stdout.write("Output\n");
```

### Bun.version / Bun.revision

```ts
console.log(Bun.version); // "polyfill"
console.log(Bun.revision); // "node-polyfill"
```

## Requirements

- Node.js >= 22
- ESM only

## License

GPL-3.0-only
