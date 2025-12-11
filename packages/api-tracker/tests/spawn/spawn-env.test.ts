import { test } from "bun:test";
import { spawn } from "bun";

// Helper to run Node.js with polyfills loaded
function nodeWithPolyfillsExe(): string {
  // In polyfill tests, we use Node.js with the polyfill preload
  return process.execPath;
}

// Initialize polyfills for Node.js compatibility
import { initBunShims } from "@kjanat/bun-polyfills";

await initBunShims();
test("spawn env", async () => {
  const env = {};
  Object.defineProperty(env, "LOL", {
    get() {
      throw new Error("Bad!!");
    },
    configurable: false,
    enumerable: true,
  });

  // This was the minimum to reliably cause a crash in Bun < v1.1.42
  for (let i = 0; i < 1024 * 10; i++) {
    try {
      const _result = spawn({
        env,
        cmd: [nodeWithPolyfillsExe(), "-e", "console.log(process.env.LOL)"],
      });
    } catch (_e) {}
  }
});
