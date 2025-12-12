// @kjanat/bun-polyfills - Polyfills for Bun APIs to run on Node.js
//
// Usage:
//   import { initBunShims } from "@kjanat/bun-polyfills";
//   await initBunShims();
//   // Now use Bun.file(), Bun.$, etc.

export {
  deflateSync,
  gunzipSync,
  gzipSync,
  inflateSync,
  initCompression,
} from "./compression.ts";
export {
  CryptoHasher,
  hash,
  initCrypto,
  MD4,
  MD5,
  password,
  SHA1,
  SHA224,
  SHA256,
  SHA384,
  SHA512,
  SHA512_256,
} from "./crypto.ts";
export { initEnv } from "./env.ts";
export { initFile } from "./file.ts";
export { Glob, initGlob } from "./glob.ts";
export { initModules } from "./modules.ts";
export {
  gc,
  initProcess,
  isMainThread,
  nanoseconds,
  sleep,
  sleepSync,
  which,
} from "./process.ts";
export { initShell } from "./shell.ts";
export { initSpawn } from "./spawn.ts";
export { initTOML, TOML } from "./toml.ts";
export * from "./types.ts";
export {
  concatArrayBuffers,
  deepEquals,
  deepMatch,
  escapeHTML,
  initUtils,
  inspect,
  peek,
  stringWidth,
  stripANSI,
} from "./utils.ts";

import { initCompression } from "./compression.ts";
import { initCrypto } from "./crypto.ts";
import { initEnv } from "./env.ts";
import { initFile } from "./file.ts";
import { initGlob } from "./glob.ts";
import { initModules } from "./modules.ts";
import { initProcess } from "./process.ts";
import { initShell } from "./shell.ts";
import { initSpawn } from "./spawn.ts";
import { initTOML } from "./toml.ts";
import type { PolyfillBun } from "./types.ts";
// Import directly to ensure they are bundled
import { initUtils } from "./utils.ts";

/**
 * Initialize all Bun polyfills on globalThis.Bun
 * No-op if running in native Bun runtime.
 */
export async function initBunShims(): Promise<void> {
  if (globalThis.Bun !== undefined && !process.env.BUN_POLYFILLS_FORCE) {
    return; // Native Bun or already shimmed: No-op
  }
  if (process.env.BUN_POLYFILLS_FORCE && globalThis.Bun === undefined) {
    // Force mode but Bun doesn't exist? Create it.
    (globalThis as { Bun?: unknown }).Bun = {} as PolyfillBun;
  } else if (process.env.BUN_POLYFILLS_FORCE) {
    // Force mode and Bun exists - proceed to overwrite
  } else {
    // Normal mode and Bun doesn't exist - create it
    (globalThis as { Bun?: unknown }).Bun = {} as PolyfillBun;
  }

  // We know Bun exists now (either native or our object)
  const Bun = globalThis.Bun as unknown as PolyfillBun;

  // Initialize all polyfills directly without dynamic import to ensure code is included
  initEnv(Bun);
  initFile(Bun);
  initShell(Bun);
  initSpawn(Bun);
  initModules(Bun);
  initProcess(Bun);
  initCompression(Bun);
  initGlob(Bun);
  initTOML(Bun);
  initUtils(Bun);
  initCrypto(Bun);
}

export default initBunShims;
