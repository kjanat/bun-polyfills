// Bun.env polyfill - maps to process.env

import type { PolyfillBun } from "./types.ts";

export function initEnv(bun: Partial<PolyfillBun>): void {
  if (!("env" in bun)) {
    bun.env = process.env;
  }
}
