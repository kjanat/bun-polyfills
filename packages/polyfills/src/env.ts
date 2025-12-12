// Bun.env polyfill - maps to process.env

import type { PolyfillBun } from "./types.ts";

export function initEnv(Bun: Partial<PolyfillBun>): void {
  if (!("env" in Bun)) {
    Bun.env = process.env;
  }
}
