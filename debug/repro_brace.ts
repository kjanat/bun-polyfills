import { initShell } from "./packages/polyfills/src/shell.ts";
import { $ } from "zx";

// Mock Bun environment
const mockBun: any = {};
process.env.BUN_POLYFILLS_FORCE = "1";
initShell(mockBun);

async function test() {
  console.log("--- Testing Brace Expansion ---");
  try {
    // Expected: "a1 a2 a3 b1 b2 b3 c1 c2 c3"
    // We use { verbose: true } to see what's happening if possible, but zx defaults to verbose
    const res = await mockBun.$`echo {a,b,c}{1,2,3}`;
    console.log(`STDOUT: "${res.text().trim()}"`);

    if (res.text().trim() === "a1 a2 a3 b1 b2 b3 c1 c2 c3") {
      console.log("PASS");
    } else {
      console.log("FAIL");
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
