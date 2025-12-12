import { expect, test } from "bun:test";
import { unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// Initialize polyfills for Node.js compatibility
import { initBunShims } from "@kjanat/bun-polyfills";
import { write } from "bun";

await initBunShims();
test("bun-file-exists", async () => {
  expect(await Bun.file(import.meta.path).exists()).toBeTrue();
  expect(await Bun.file(`${import.meta.path}boop`).exists()).toBeFalse();
  expect(await Bun.file(import.meta.dir).exists()).toBeFalse();
  expect(await Bun.file(`${import.meta.dir}/`).exists()).toBeFalse();
  const temp = join(tmpdir(), "bun-file-exists.test.js");
  try {
    unlinkSync(temp);
  } catch {}
  expect(await Bun.file(temp).exists()).toBeFalse();
  await write(temp, "boop");
  expect(await Bun.file(temp).exists()).toBeTrue();
  unlinkSync(temp);
  expect(await Bun.file(temp).exists()).toBeFalse();
});
