// Synced from: bun/test/js/bun/spawn/spawnSync-memfd-fixture.ts
// NOTE: This fixture tests Bun-native internals (bun:internal-for-testing)
// which cannot be polyfilled. The test using this is skipped.
import { spawnSync } from "bun";

// bun:internal-for-testing is not available in polyfills
// Original code used getCounters() to verify memfd usage
const result = spawnSync({
  cmd: ["sleep", "0.00001"],
  stdout: "inherit",
  stderr: "pipe",
  stdin: "pipe",
});

// Can't verify internal counters, just check it ran
if (result.exitCode !== 0) {
  throw new Error("spawnSync failed");
}
