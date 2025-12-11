import { expect, it } from "bun:test";
// Initialize polyfills for Node.js compatibility
import { initBunShims } from "@kjanat/bun-polyfills";
import { sleepSync } from "bun";

await initBunShims();
it("sleepSync uses milliseconds", async () => {
  const start = performance.now();
  sleepSync(50);
  const end = performance.now();
  expect(end - start).toBeGreaterThanOrEqual(5);
  expect(end - start).toBeLessThan(1000);
});

it("sleepSync with no arguments throws", async () => {
  // @ts-expect-error
  expect(() => sleepSync()).toThrow();
});

it("sleepSync with non-numbers throws", async () => {
  // biome-ignore lint/suspicious/noExplicitAny: testing invalid input types
  const invalidValues = [true, false, "hi", {}, [], undefined, null] as any[];
  for (const v of invalidValues) {
    expect(() => sleepSync(v)).toThrow();
  }
});

it("sleepSync with negative number throws", async () => {
  expect(() => sleepSync(-10)).toThrow();
});

it("can map with sleepSync", async () => {
  [1, 2, 3].map(sleepSync);
});
