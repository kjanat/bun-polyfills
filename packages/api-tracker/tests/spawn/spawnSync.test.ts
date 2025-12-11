import { describe, expect, it } from "bun:test";
import { bunEnv } from "../harness";

// Helper to run Node.js with polyfills loaded
function nodeWithPolyfillsExe(): string {
  // In polyfill tests, we use Node.js with the polyfill preload
  return process.execPath;
}

// Initialize polyfills for Node.js compatibility
import { initBunShims } from "@kjanat/bun-polyfills";

await initBunShims();
describe("spawnSync", () => {
  it("should throw a RangeError if timeout is less than 0", () => {
    expect(() =>
      Bun.spawnSync({
        cmd: [nodeWithPolyfillsExe()],
        env: bunEnv,
        timeout: -1,
      }),
    ).toThrowErrorMatchingInlineSnapshot(
      `"The value of "timeout" is out of range. It must be >= 0 and <= 9007199254740991. Received -1"`,
    );
  });

  for (const ioOption of ["ignore", "pipe", "inherit"]) {
    it(`should not set a timeout if timeout is 0 and ${ioOption} is used for stdout`, () => {
      const start = performance.now();
      const result = Bun.spawnSync({
        cmd: [nodeWithPolyfillsExe(), "-e", "setTimeout(() => {}, 5)"],
        env: bunEnv,
        stdin: "ignore",
        stdout: ioOption,
        stderr: ioOption,
        timeout: 0,
        maxBuffer: 0,
      });
      const end = performance.now();
      expect(end - start).toBeLessThan(1000);
      expect(!!result.exitedDueToTimeout).toBe(false);
      expect(result.exitCode).toBe(0);
    });
  }

  // NOTE: These tests use bun:internal-for-testing which cannot be polyfilled
  // They verify Bun-native optimizations (memfd, spawnSync_blocking counters)
  it.skip("should use memfd when possible (requires bun:internal-for-testing)", () => {
    // Original: expect([join(import.meta.dir, "spawnSync-memfd-fixture.ts")]).toRun();
  });

  it.skip("should use spawnSync optimizations when possible (requires bun:internal-for-testing)", () => {
    // Original: expect([join(import.meta.dir, "spawnSync-counters-fixture.ts")]).toRun();
  });
});
