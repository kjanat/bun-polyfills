// Bun.version and Bun.revision polyfills

import type { PolyfillBun } from "./types.ts";

export function initModules(Bun: Partial<PolyfillBun>): void {
  if (!("version" in Bun)) {
    Object.defineProperty(Bun, "version", {
      value: "0.0.0-polyfill",
      writable: false,
      enumerable: true,
      configurable: false,
    });
  }

  if (!("revision" in Bun)) {
    Object.defineProperty(Bun, "revision", {
      value: "polyfill",
      writable: false,
      enumerable: true,
      configurable: false,
    });
  }
}
