// @kjanat/bun-polyfills - Polyfills for Bun APIs to run on Node.js
//
// Usage:
//   import { initBunShims } from "@kjanat/bun-polyfills";
//   await initBunShims();
//   // Now use Bun.file(), Bun.$, etc.

export * from "./types.ts";

export { initEnv } from "./env.ts";
export { initFile } from "./file.ts";
export { initShell } from "./shell.ts";
export { initSpawn } from "./spawn.ts";
export { initModules } from "./modules.ts";
export {
  initProcess,
  which,
  sleep,
  sleepSync,
  nanoseconds,
  isMainThread,
  gc,
} from "./process.ts";

import type { PolyfillBun } from "./types.ts";

/**
 * Initialize all Bun polyfills on globalThis.Bun
 * No-op if running in native Bun runtime.
 */
export async function initBunShims(): Promise<void> {
  if (globalThis.Bun !== undefined) {
    return; // Native Bun or already shimmed: No-op
  }

  const bun = {} as PolyfillBun;

  // Cast to unknown first since we're shimming with a partial implementation
  (globalThis as { Bun?: unknown }).Bun = bun;

  // Initialize all polyfills
  const { initEnv } = await import("./env.ts");
  initEnv(bun);

  const { initFile } = await import("./file.ts");
  initFile(bun);

  const { initShell } = await import("./shell.ts");
  initShell(bun);

  const { initSpawn } = await import("./spawn.ts");
  initSpawn(bun);

  const { initModules } = await import("./modules.ts");
  initModules(bun);

  const { initProcess } = await import("./process.ts");
  initProcess(bun);
}

export default initBunShims;
