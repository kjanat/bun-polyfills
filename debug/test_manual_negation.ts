import { initShell } from "./packages/polyfills/src/shell.ts";

// Mock the Bun object
const MockBun: any = {};
// Force init
process.env.BUN_POLYFILLS_FORCE = "1";
initShell(MockBun);

async function run() {
  console.log("--- Starting Test ---");
  try {
    const cmd = MockBun.$`if ! echo foo; then echo bar; fi`;
    const result = await cmd;
    console.log("Exit Code:", result.exitCode);
    console.log("Stdout:", JSON.stringify(result.text()));
    console.log("Stderr:", JSON.stringify(result.stderr.toString()));
  } catch (e) {
    console.error("Error:", e);
  }
  console.log("--- End Test ---");
}

run();
