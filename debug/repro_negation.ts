import { initShell } from "./packages/polyfills/src/shell.ts";
import { $ } from "zx";

// Mock Bun environment
const mockBun: any = {};
process.env.BUN_POLYFILLS_FORCE = "1";
initShell(mockBun);

async function test() {
  console.log("--- Testing negation (!) ---");
  try {
    // Should print "foo" then "bar" because "! echo foo" is false (since echo foo succeeds),
    // wait, `if ! echo foo` -> echo foo runs (prints foo), returns 0 (true). !0 is false.
    // So `then echo bar` should NOT run.

    // Ah, the test case says:
    // TestBuilder.command`if ! echo foo; then echo bar; fi`.stdout("foo\n")
    // This expects "foo\n" only. "bar" should NOT be printed.

    const res = await mockBun.$`if ! echo foo; then echo bar; fi`;
    console.log(`STDOUT: ${JSON.stringify(res.text())}`);
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
