# bun-polyfills

[![Bun API Coverage][badge:Bun API Coverage]][COVERAGE.md]

[![pkg.pr.new][badge:pkg-pr]][pkg-pr]

Bun API polyfills for Node.js runtime. Use Bun APIs (`Bun.file()`, `Bun.$`,
`Bun.spawn()`, etc.) in Node.js environments.

## Packages

| Package                                        | Description                                       |
| ---------------------------------------------- | ------------------------------------------------- |
| [@kjanat/bun-polyfills][package:polyfills]     | Core polyfills for Bun APIs                       |
| [@kjanat/bun-polyfills-plugin][package:plugin] | Bun build plugin to stub polyfills for bun target |

## Quick Start

```bash
# bun add @kjanat/bun-polyfills // Still in testing, not on npm yet
bun add https://pkg.pr.new/@kjanat/bun-polyfills@master

# Or add as alias
# Then import from 'bun-polyfills'
bun add bun-polyfills@https://pkg.pr.new/@kjanat/bun-polyfills@master # or sha, or tag, or branch

# Examples of all three packages by specific commit:
npm i https://pkg.pr.new/kjanat/bun-polyfills/@kjanat/bun-api-tracker@fb4ad52
npm i https://pkg.pr.new/kjanat/bun-polyfills/@kjanat/bun-polyfills-plugin@fb4ad52
npm i https://pkg.pr.new/kjanat/bun-polyfills/@kjanat/bun-polyfills@fb4ad52
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

AGPL-3.0

<!--link definitions-->
<!--prettier-ignore-start-->

<!--[package:api-tracker]: ./packages/api-tracker-->
[badge:Bun API Coverage]: https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/kjanat/bun-polyfills/master/packages/api-tracker/output/badge.json
[badge:pkg-pr]: https://pkg.pr.new/badge/kjanat/bun-polyfills
[COVERAGE.md]: ./packages/api-tracker/output/COVERAGE.md
[package:plugin]: ./packages/plugin
[package:polyfills]: ./packages/polyfills
[pkg-pr]: https://pkg.pr.new/~/kjanat/bun-polyfills

<!--prettier-ignore-end-->
