import { expect, test } from "bun:test";
import { bunEnv, bunExe } from "../harness";

// Helper to run Node.js with polyfills loaded
function nodeWithPolyfillsExe() {
  // In polyfill tests, we use Node.js with the polyfill preload
  return process.execPath;
}

// Initialize polyfills for Node.js compatibility
import { initBunShims } from "@kjanat/bun-polyfills";

await initBunShims();
test("Bun.isMainThread", () => {
  expect(Bun.isMainThread).toBeTrue();

  const { stdout, exitCode } = Bun.spawnSync({
    cmd: [
      nodeWithPolyfillsExe(),
      import.meta.resolveSync("./main-worker-file.js"),
    ],
    stderr: "inherit",
    stdout: "pipe",
    env: bunEnv,
  });
  expect(exitCode).toBe(0);
  expect(stdout.toString()).toBe("isMainThread true\nisMainThread false\n");
});
