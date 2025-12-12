import { $ } from "zx";

try {
  console.log("Testing zx negation...");
  await $`if ! echo foo; then echo bar; fi`;
  console.log("Success!");
} catch (e) {
  console.error("Failed:", e);
}
