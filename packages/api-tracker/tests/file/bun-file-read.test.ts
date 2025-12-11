import { expect, it } from "bun:test";
import { tmpdir } from "node:os";

// Initialize polyfills for Node.js compatibility
import { initBunShims } from "@kjanat/bun-polyfills";

await initBunShims();
it("offset should work in Bun.file() #4963", async () => {
  const filename = tmpdir() + "/bun.test.offset.txt";
  await Bun.write(filename, "contents");
  const file = Bun.file(filename);
  const slice = file.slice(2, file.size);
  const contents = await slice.text();
  expect(contents).toBe("ntents");
});
