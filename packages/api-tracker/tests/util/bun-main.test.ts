import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import "../harness";
// Initialize polyfills for Node.js compatibility
import { initBunShims } from "@kjanat/bun-polyfills";
await initBunShims();
// for expect().toRun()

describe("Bun.main", () => {
  test("can be overridden", () => {
    expect(Bun.main).toBeString();
    const override = { foo: "bar" };
    // types say Bun.main is a readonly string, but we want to write it
    // and check it can be set to a non-string
    (Bun as any).main = override;
    expect(Bun.main as any).toBe(override);
  });

  // NOTE: This test uses expect().toRun() which is a Bun-specific test harness feature
  // that spawns a subprocess to run the test files. Not applicable to polyfills.
  test.skip("override is reset when switching to a new test file (requires Bun test harness)", () => {
    // Original: expect(["test", ...fixtures]).toRun();
  });
});
