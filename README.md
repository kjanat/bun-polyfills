# bun-polyfills

[![Bun API Coverage](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/kjanat/bun-polyfills/master/packages/api-tracker/output/badge.json)](./packages/api-tracker/output/COVERAGE.md)

Bun API polyfills for Node.js runtime. Use Bun APIs (`Bun.file()`, `Bun.$`,
`Bun.spawn()`, etc.) in Node.js environments.

## Packages

| Package                                           | Description                                       |
| ------------------------------------------------- | ------------------------------------------------- |
| [@kjanat/bun-polyfills](./packages/polyfills)     | Core polyfills for Bun APIs                       |
| [@kjanat/bun-polyfills-plugin](./packages/plugin) | Bun build plugin to stub polyfills for bun target |

## Quick Start

```bash
bun add @kjanat/bun-polyfills
```

```ts
import { initBunShims } from "@kjanat/bun-polyfills";

await initBunShims();

// Now use Bun APIs in Node.js
const file = Bun.file("./package.json");
const text = await file.text();

await Bun.$`echo "Hello from shell"`;

const proc = Bun.spawn(["ls", "-la"]);
await proc.exited;
```

## Build Plugin

When building for both Node.js and Bun targets, use the plugin to stub polyfills
for Bun:

```bash
bun add -D @kjanat/bun-polyfills-plugin
```

```ts
import { conditionalPolyfillPlugin } from "@kjanat/bun-polyfills-plugin";

await Bun.build({
  entrypoints: ["./src/main.ts"],
  target: "bun", // polyfills will be stubbed
  plugins: [conditionalPolyfillPlugin],
});
```

## Requirements

- Node.js >= 22 (for Node.js runtime)
- ESM only

## License

GPL-3.0-only
