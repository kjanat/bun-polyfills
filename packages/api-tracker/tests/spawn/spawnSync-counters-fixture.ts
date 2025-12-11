// Synced from: bun/test/js/bun/spawn/spawnSync-counters-fixture.ts
// NOTE: This fixture tests Bun-native internals (bun:internal-for-testing)
// which cannot be polyfilled. The test using this is skipped.
import { spawnSync } from "bun";

// bun:internal-for-testing is not available in polyfills
// Original code used getCounters() to verify spawnSync optimizations
const result = spawnSync({
  cmd: ["sleep", "0.00001"],
  stdout: process.platform === "linux" ? "pipe" : "inherit",
  stderr: "inherit",
  stdin: "inherit",
});

// Can't verify internal counters, just check it ran
if (result.exitCode !== 0) {
  throw new Error("spawnSync failed");
}
