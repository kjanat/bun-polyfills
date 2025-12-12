import { $ } from "zx";

// Disable verbose to match the test case default (usually quiet unless specified)
$.verbose = false;

async function run() {
  console.log("--- Running direct zx ---");
  try {
    const result = await $`if ! echo foo; then echo bar; fi`;
    console.log("Exit Code:", result.exitCode);
    console.log("Stdout:", JSON.stringify(result.stdout));
    console.log("Stderr:", JSON.stringify(result.stderr));
  } catch (p) {
    console.log("Error Exit Code:", p.exitCode);
    console.log("Error Stdout:", JSON.stringify(p.stdout));
    console.log("Error Stderr:", JSON.stringify(p.stderr));
  }
}

run();
