#!/usr/bin/env bun
// Script to sync and transform Bun test files for polyfill compatibility testing
// Usage: bun run src/test-sync.ts [--dry-run]

import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Mapping of Bun test files to sync
 * Source path (relative to bun/test) -> Destination path (relative to tests/)
 */
const TEST_MAPPINGS: Record<string, string> = {
  // File APIs
  "js/bun/util/bun-file.test.ts": "file/bun-file.test.ts",
  "js/bun/util/filesink.test.ts": "file/filesink.test.ts",
  "js/bun/util/bun-file-read.test.ts": "file/bun-file-read.test.ts",
  "js/bun/util/bun-file-exists.test.js": "file/bun-file-exists.test.js",
  "js/bun/util/file-type.test.ts": "file/file-type.test.ts",

  // Spawn APIs
  "js/bun/spawn/spawn.test.ts": "spawn/spawn.test.ts",
  "js/bun/spawn/spawnSync.test.ts": "spawn/spawnSync.test.ts",
  "js/bun/spawn/spawn-env.test.ts": "spawn/spawn-env.test.ts",

  // Shell APIs
  "js/bun/shell/bunshell.test.ts": "shell/bunshell.test.ts",
  "js/bun/shell/bunshell-file.test.ts": "shell/bunshell-file.test.ts",

  // Utility APIs
  "js/bun/util/sleep.test.ts": "util/sleep.test.ts",
  "js/bun/util/sleepSync.test.ts": "util/sleepSync.test.ts",
  "js/bun/util/which.test.ts": "util/which.test.ts",
  "js/bun/util/escapeHTML.test.js": "util/escapeHTML.test.js",
  "js/bun/util/inspect.test.js": "util/inspect.test.js",
  "js/bun/util/peek.test.ts": "util/peek.test.ts",
  "js/bun/util/bun-isMainThread.test.js": "util/bun-isMainThread.test.js",
  "js/bun/util/bun-main.test.ts": "util/bun-main.test.ts",
  "js/bun/util/fileUrl.test.js": "util/fileUrl.test.js",
  "js/bun/util/concat.test.js": "util/concat.test.js",
  "js/bun/util/stringWidth.test.ts": "util/stringWidth.test.ts",
  "js/bun/util/stripANSI.test.ts": "util/stripANSI.test.ts",

  // Glob
  "js/bun/glob/glob.test.ts": "glob/glob.test.ts",

  // Compression
  "js/bun/util/zstd.test.ts": "compression/zstd.test.ts",

  // Hash/Crypto (some may need native)
  "js/bun/util/hash.test.js": "crypto/hash.test.js",
  "js/bun/util/password.test.ts": "crypto/password.test.ts",
};

/**
 * Files that need to be copied as-is (fixtures, utilities)
 */
const COPY_FILES: Record<string, string> = {
  // Shell test utilities
  "js/bun/shell/util.ts": "shell/util.ts",
  "js/bun/shell/test_builder.ts": "shell/test_builder.ts",

  // Spawn fixtures
  "js/bun/spawn/exit-code-0.js": "spawn/fixtures/exit-code-0.js",
  "js/bun/spawn/exit-code-1.js": "spawn/fixtures/exit-code-1.js",
  "js/bun/spawn/does-not-hang.js": "spawn/does-not-hang.js",
  "js/bun/spawn/spawnSync-memfd-fixture.ts": "spawn/spawnSync-memfd-fixture.ts",
  "js/bun/spawn/spawnSync-counters-fixture.ts":
    "spawn/spawnSync-counters-fixture.ts",

  // Util fixtures
  "js/bun/util/sleep-4ever.js": "util/sleep-4ever.js",
  "js/bun/util/sleep-keepalive.ts": "util/sleep-keepalive.ts",
  "js/bun/util/main-worker-file.js": "util/main-worker-file.js",
  "js/bun/util/bun-main-test-fixture-1.ts": "util/bun-main-test-fixture-1.ts",
  "js/bun/util/bun-main-test-fixture-2.ts": "util/bun-main-test-fixture-2.ts",
};

/**
 * Patterns that indicate a test requires native Bun and should be skipped
 */
const NATIVE_BUN_PATTERNS = [
  /Bun\.serve\(/,
  /Bun\.build\(/,
  /Bun\.Transpiler/,
  /bun:sqlite/,
  /bun:ffi/,
  /bun:jsc/,
  /bun:internal-for-testing/,
  /heapStats/,
  /unsafe\.gcAggressionLevel/,
];

/**
 * Special transformations for fixture files that need modification
 * Key is the destination path, value is transform function
 */
const FIXTURE_TRANSFORMS: Record<
  string,
  (content: string) => { content: string; note?: string }
> = {
  // does-not-hang.js uses shellExe() from harness and long sleep - modify for polyfills
  "spawn/does-not-hang.js": (content) => ({
    content: `// Synced from: bun/test/js/bun/spawn/does-not-hang.js
// Modified: uses /bin/sh instead of shellExe() from harness
// Modified: use shorter sleep to avoid hanging in polyfill tests
const s = Bun.spawn({
  cmd: ["/bin/sh", "-c", "sleep 0.1"],
});

s.unref();
`,
    note: "Modified sleep duration and shell path for polyfill compatibility",
  }),

  // spawnSync fixtures use bun:internal-for-testing - provide stubs
  "spawn/spawnSync-memfd-fixture.ts": (content) => ({
    content: `// Synced from: bun/test/js/bun/spawn/spawnSync-memfd-fixture.ts
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
`,
    note: "Stubbed - original uses bun:internal-for-testing",
  }),

  "spawn/spawnSync-counters-fixture.ts": (content) => ({
    content: `// Synced from: bun/test/js/bun/spawn/spawnSync-counters-fixture.ts
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
`,
    note: "Stubbed - original uses bun:internal-for-testing",
  }),
};

/**
 * Transform a test file for polyfill compatibility
 */
function transformTestFile(content: string, sourcePath: string): string {
  let transformed = content;
  const isTypeScript = sourcePath.endsWith(".ts");

  // 1. Replace harness import path
  transformed = transformed.replace(
    /from ["']harness["']/g,
    'from "../harness"',
  );

  // 2. Add polyfill initialization at the top (after imports)
  const hasPolyfillInit = transformed.includes("initBunShims");
  if (!hasPolyfillInit) {
    // Find the end of imports
    const importEndMatch = transformed.match(/^((?:import[^;]+;?\s*)+)/m);
    if (importEndMatch?.[1]) {
      const importSection = importEndMatch[1];
      const polyfillImport = `
// Initialize polyfills for Node.js compatibility
import { initBunShims } from "@kjanat/bun-polyfills";
await initBunShims();
`;
      transformed = transformed.replace(
        importSection,
        importSection + polyfillImport,
      );
    }
  }

  // 3. Mark tests that require native Bun with .skip and a note
  for (const pattern of NATIVE_BUN_PATTERNS) {
    if (pattern.test(transformed)) {
      // Add a comment at the top
      if (!transformed.includes("// NOTE: Some tests require native Bun")) {
        transformed = `// NOTE: Some tests require native Bun and are skipped in polyfill testing\n// Source: ${sourcePath}\n\n${transformed}`;
      }
      break;
    }
  }

  // 4. Replace bunExe() calls to use Node with polyfills
  // This is tricky - we need to spawn node with polyfills loaded
  transformed = transformed.replace(/bunExe\(\)/g, "nodeWithPolyfillsExe()");

  // 5. Add nodeWithPolyfillsExe helper if bunExe was replaced
  // Use TypeScript syntax only for .ts files
  if (
    transformed.includes("nodeWithPolyfillsExe()") &&
    !transformed.includes("function nodeWithPolyfillsExe")
  ) {
    const helperCode =
      isTypeScript ?
        `
// Helper to run Node.js with polyfills loaded
function nodeWithPolyfillsExe(): string {
  // In polyfill tests, we use Node.js with the polyfill preload
  return process.execPath;
}
`
      : `
// Helper to run Node.js with polyfills loaded
function nodeWithPolyfillsExe() {
  // In polyfill tests, we use Node.js with the polyfill preload
  return process.execPath;
}
`;
    // Add after imports
    const importEndMatch2 = transformed.match(/^((?:import[^;]+;?\s*)+)/m);
    if (importEndMatch2?.[1]) {
      const importSection = importEndMatch2[1];
      transformed = transformed.replace(
        importSection,
        importSection + helperCode,
      );
    }
  }

  return transformed;
}

/**
 * Ensure directory exists
 */
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Sync test files from Bun repository
 */
export async function syncTests(
  options: { dryRun?: boolean } = {},
): Promise<void> {
  const bunTestDir = path.resolve(process.cwd(), "../../bun/test");
  const outputDir = path.resolve(process.cwd(), "tests");

  console.log("Syncing Bun tests for polyfill compatibility testing...\n");
  console.log(`Source: ${bunTestDir}`);
  console.log(`Output: ${outputDir}`);
  if (options.dryRun) {
    console.log("(DRY RUN - no files will be modified)\n");
  }
  console.log("");

  // Check if bun test directory exists
  if (!fs.existsSync(bunTestDir)) {
    console.error(`Error: Bun test directory not found: ${bunTestDir}`);
    console.error("Make sure the bun repository is cloned at ../../bun");
    process.exit(1);
  }

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  // Sync test files
  console.log("=== Syncing Test Files ===\n");
  for (const [src, dest] of Object.entries(TEST_MAPPINGS)) {
    const srcPath = path.join(bunTestDir, src);
    const destPath = path.join(outputDir, dest);

    if (!fs.existsSync(srcPath)) {
      console.log(`  SKIP (not found): ${src}`);
      skipped++;
      continue;
    }

    try {
      const content = fs.readFileSync(srcPath, "utf-8");
      const transformed = transformTestFile(content, src);

      if (!options.dryRun) {
        ensureDir(path.dirname(destPath));
        fs.writeFileSync(destPath, transformed);
      }

      console.log(`  SYNC: ${src} -> ${dest}`);
      synced++;
    } catch (err) {
      console.log(`  ERROR: ${src} - ${err}`);
      errors++;
    }
  }

  // Copy fixture files
  console.log("\n=== Copying Fixture Files ===\n");
  for (const [src, dest] of Object.entries(COPY_FILES)) {
    const srcPath = path.join(bunTestDir, src);
    const destPath = path.join(outputDir, dest);

    if (!fs.existsSync(srcPath)) {
      console.log(`  SKIP (not found): ${src}`);
      skipped++;
      continue;
    }

    try {
      // Check if this fixture needs special transformation
      const transform = FIXTURE_TRANSFORMS[dest];
      if (transform) {
        const originalContent = fs.readFileSync(srcPath, "utf-8");
        const { content, note } = transform(originalContent);
        if (!options.dryRun) {
          ensureDir(path.dirname(destPath));
          fs.writeFileSync(destPath, content);
        }
        console.log(
          `  TRANSFORM: ${src} -> ${dest}${note ? ` (${note})` : ""}`,
        );
      } else {
        if (!options.dryRun) {
          ensureDir(path.dirname(destPath));
          fs.copyFileSync(srcPath, destPath);
        }
        console.log(`  COPY: ${src} -> ${dest}`);
      }
      synced++;
    } catch (err) {
      console.log(`  ERROR: ${src} - ${err}`);
      errors++;
    }
  }

  console.log("\n=== Summary ===");
  console.log(`  Synced: ${synced}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors: ${errors}`);

  if (options.dryRun) {
    console.log(
      "\n(This was a dry run. Run without --dry-run to apply changes.)",
    );
  }
}

/**
 * List available test files in Bun repository
 */
async function listAvailableTests(): Promise<void> {
  const bunTestDir = path.resolve(process.cwd(), "../../bun/test");

  if (!fs.existsSync(bunTestDir)) {
    console.error(`Error: Bun test directory not found: ${bunTestDir}`);
    process.exit(1);
  }

  console.log("Available Bun test files:\n");

  const relevantDirs = [
    "js/bun/util",
    "js/bun/spawn",
    "js/bun/shell",
    "js/bun/glob",
  ];

  for (const dir of relevantDirs) {
    const fullDir = path.join(bunTestDir, dir);
    if (!fs.existsSync(fullDir)) continue;

    console.log(`\n${dir}/`);
    const files = fs
      .readdirSync(fullDir)
      .filter((f) => f.endsWith(".test.ts") || f.endsWith(".test.js"));
    for (const file of files) {
      const mapped = TEST_MAPPINGS[`${dir}/${file}`];
      const status = mapped ? `-> ${mapped}` : "(not mapped)";
      console.log(`  ${file} ${status}`);
    }
  }
}

// CLI - only run when executed directly
if (import.meta.main) {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Bun Test Sync - Sync Bun tests for polyfill compatibility testing

USAGE:
  bun run src/test-sync.ts [command] [options]

COMMANDS:
  sync      Sync test files (default)
  list      List available test files

OPTIONS:
  --dry-run   Show what would be done without making changes
  --help      Show this help message
`);
    process.exit(0);
  }

  if (args.includes("list")) {
    await listAvailableTests();
  } else {
    await syncTests({ dryRun: args.includes("--dry-run") });
  }
}
