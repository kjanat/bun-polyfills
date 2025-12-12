import { initShell } from "./packages/polyfills/src/shell.ts";
import { $ } from "zx";

// Mock Bun environment
const mockBun: any = {};
process.env.BUN_POLYFILLS_FORCE = "1";

console.log("Initializing shell polyfill...");
initShell(mockBun);

async function test() {
  const cwd = process.cwd();
  console.log(`Current CWD: ${cwd}`);

  try {
    // Test .env()
    console.log("\n--- Testing .env() ---");
    const envRes = await mockBun.$`echo $TEST_VAR`.env({
      ...process.env,
      TEST_VAR: "working",
    });
    console.log(`Result: "${envRes.text().trim()}"`);
    if (envRes.text().trim() === "working") {
      console.log("PASS: .env() works");
    } else {
      console.log("FAIL: .env() did not set variable");
    }

    // Test .cwd()
    console.log("\n--- Testing .cwd() ---");
    // We'll try to list a directory that definitely exists but isn't current, e.g. /tmp or /bin
    const targetDir = "/bin"; // Linux specific, but we are on Linux
    const cwdRes = await mockBun.$`pwd`.cwd(targetDir);
    const outputCwd = cwdRes.text().trim();
    console.log(`Result CWD: "${outputCwd}"`);
    console.log(`Expected CWD: "${targetDir}"`);

    // Note: /bin might resolve to /usr/bin, so we check inclusion or equality
    if (outputCwd === targetDir || outputCwd === "/usr/bin") {
      console.log("PASS: .cwd() works");
    } else {
      console.log("FAIL: .cwd() did not change directory");
    }
  } catch (e) {
    console.error("Error during test:", e);
  }
}

test();
