import { expect, test } from "bun:test";
// Initialize polyfills for Node.js compatibility
import { initBunShims } from "@kjanat/bun-polyfills";
import { $ } from "bun";

await initBunShims();
test("$ with Bun.file prints the path", async () => {
  expect(await $`echo ${Bun.file(import.meta.path)}`.text()).toBe(
    `${import.meta.path}\n`,
  );
  expect(await $`echo ${import.meta.path}`.text()).toBe(
    `${import.meta.path}\n`,
  );
});
