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
export {
  initCompression,
  gzipSync,
  gunzipSync,
  deflateSync,
  inflateSync,
} from "./compression.ts";
export { initGlob, Glob } from "./glob.ts";
export { initTOML, TOML } from "./toml.ts";
export {
  initUtils,
  escapeHTML,
  stripANSI,
  stringWidth,
  peek,
  deepEquals,
  deepMatch,
  concatArrayBuffers,
  inspect,
} from "./utils.ts";

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

  const { initCompression } = await import("./compression.ts");
  initCompression(bun);

  const { initGlob } = await import("./glob.ts");
  initGlob(bun);

  const { initTOML } = await import("./toml.ts");
  initTOML(bun);

  const { initUtils } = await import("./utils.ts");
  initUtils(bun);
}

export default initBunShims;
