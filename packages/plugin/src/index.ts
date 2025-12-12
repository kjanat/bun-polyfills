// @kjanat/bun-polyfills-plugin - Bun build plugin for conditional polyfill inclusion
//
// Usage:
//   import { conditionalPolyfillPlugin } from "@kjanat/bun-polyfills-plugin";
//   await Bun.build({
//     entrypoints: ["./src/main.ts"],
//     target: "bun", // Plugin stubs polyfills for bun target
//     plugins: [conditionalPolyfillPlugin],
//   });

import type { BunPlugin, PluginBuilder } from "bun";

/**
 * Bun build plugin that conditionally excludes polyfills when building for Bun target.
 * When target is "bun", polyfill modules are replaced with empty stubs.
 * When target is "node", polyfills are included normally.
 */
export const conditionalPolyfillPlugin: BunPlugin = {
  name: "conditional-polyfills",
  setup(build: PluginBuilder): void {
    const target = build.config.target;

    // Only stub polyfills for bun target
    if (target === "bun") {
      // Intercept @kjanat/bun-polyfills imports
      build.onResolve({ filter: /@kjanat\/bun-polyfills/ }, (args) => {
        return { path: args.path, namespace: "polyfill-stub" };
      });

      // Also intercept relative polyfill imports (for when used alongside source)
      build.onResolve({ filter: /\/polyfills\// }, (args) => {
        return { path: args.path, namespace: "polyfill-stub" };
      });

      // Return empty stub for polyfill modules
      build.onLoad({ filter: /.*/, namespace: "polyfill-stub" }, () => {
        return {
          contents: `
            // Stub: polyfills not needed for Bun target
            export async function initBunShims() {
              // No-op when running in native Bun
            }
            export function initEnv() {}
            export function initFile() {}
            export function initShell() {}
            export function initSpawn() {}
            export function initModules() {}
            export default initBunShims;
          `,
          loader: "ts",
        };
      });
    }
  },
};

export default conditionalPolyfillPlugin;
