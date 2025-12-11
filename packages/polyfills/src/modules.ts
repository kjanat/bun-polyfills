// Bun.version and Bun.revision polyfills

import type { PolyfillBun } from "./types.ts";

export function initModules(bun: Partial<PolyfillBun>): void {
  if (!("version" in bun)) {
    Object.defineProperty(bun, "version", {
      value: "0.0.0-polyfill",
      writable: false,
      enumerable: true,
      configurable: false,
    });
  }

  if (!("revision" in bun)) {
    Object.defineProperty(bun, "revision", {
      value: "polyfill",
      writable: false,
      enumerable: true,
      configurable: false,
    });
  }
}
