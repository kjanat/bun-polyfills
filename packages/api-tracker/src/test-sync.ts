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

  // Glob
  "js/bun/glob/glob.test.ts": "glob/glob.test.ts",

  // Compression (if exists)
  // "js/bun/util/zlib.test.ts": "compression/zlib.test.ts",
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
  /heapStats/,
  /unsafe\.gcAggressionLevel/,
];

/**
 * Transform a test file for polyfill compatibility
 */
function transformTestFile(content: string, sourcePath: string): string {
  let transformed = content;

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
    if (importEndMatch && importEndMatch[1]) {
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
  if (
    transformed.includes("nodeWithPolyfillsExe()") &&
    !transformed.includes("function nodeWithPolyfillsExe")
  ) {
    const helperCode = `
// Helper to run Node.js with polyfills loaded
function nodeWithPolyfillsExe(): string {
  // In polyfill tests, we use Node.js with the polyfill preload
  return process.execPath;
}
`;
    // Add after imports
    const importEndMatch2 = transformed.match(/^((?:import[^;]+;?\s*)+)/m);
    if (importEndMatch2 && importEndMatch2[1]) {
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
      if (!options.dryRun) {
        ensureDir(path.dirname(destPath));
        fs.copyFileSync(srcPath, destPath);
      }

      console.log(`  COPY: ${src} -> ${dest}`);
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
