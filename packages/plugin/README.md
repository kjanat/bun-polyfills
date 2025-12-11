# @kjanat/bun-polyfills-plugin

Bun build plugin that stubs `@kjanat/bun-polyfills` when building for
`target: "bun"`.

## Installation

```bash
bun add -D @kjanat/bun-polyfills-plugin
```

## Usage

When you have code that uses `@kjanat/bun-polyfills` for Node.js compatibility
but also want to build for native Bun, use this plugin to exclude the polyfills
from the Bun build:

```ts
import { conditionalPolyfillPlugin } from "@kjanat/bun-polyfills-plugin";

// Building for Bun - polyfills are stubbed (not needed)
await Bun.build({
  entrypoints: ["./src/main.ts"],
  target: "bun",
  plugins: [conditionalPolyfillPlugin],
});

// Building for Node - polyfills are included
await Bun.build({
  entrypoints: ["./src/main.ts"],
  target: "node",
  plugins: [conditionalPolyfillPlugin],
});
```

## How It Works

The plugin intercepts imports of:

- `@kjanat/bun-polyfills` and all subpaths
- Any path containing `/polyfills/`

When `target === "bun"`, these imports are replaced with empty stubs since
native Bun doesn't need polyfills.

## License

GPL-3.0-only
