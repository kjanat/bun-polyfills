#!/usr/bin/env bun
// Run synced Bun tests and collect results for API coverage verification
// Tier 2 of the three-tier verification system

import * as fs from "node:fs";
import * as path from "node:path";

import type { TestCoverage, TestResult, TestRunResult } from "./types.ts";

/**
 * Map test files to API paths they cover
 */
const TEST_TO_API_MAP: Record<string, string[]> = {
  // File APIs
  "file/bun-file.test.ts": ["Bun.file", "BunFile"],
  "file/filesink.test.ts": ["FileSink", "BunFile.writer"],
  "file/bun-file-read.test.ts": [
    "BunFile.text",
    "BunFile.arrayBuffer",
    "BunFile.bytes",
  ],
  "file/bun-file-exists.test.js": ["BunFile.exists"],
  "file/file-type.test.ts": ["BunFile.type"],

  // Spawn APIs
  "spawn/spawn.test.ts": ["Bun.spawn", "Subprocess"],
  "spawn/spawnSync.test.ts": ["Bun.spawnSync", "SyncSubprocess"],
  "spawn/spawn-env.test.ts": ["Bun.spawn"],

  // Shell APIs
  "shell/bunshell.test.ts": ["Bun.$", "ShellPromise", "ShellOutput"],
  "shell/bunshell-file.test.ts": ["Bun.$", "ShellPromise"],

  // Utility APIs
  "util/sleep.test.ts": ["Bun.sleep"],
  "util/sleepSync.test.ts": ["Bun.sleepSync"],
  "util/which.test.ts": ["Bun.which"],
  "util/escapeHTML.test.js": ["Bun.escapeHTML"],
  "util/inspect.test.js": ["Bun.inspect"],
  "util/peek.test.ts": ["Bun.peek"],
  "util/bun-isMainThread.test.js": ["Bun.isMainThread"],
  "util/bun-main.test.ts": ["Bun.main"],
  "util/fileUrl.test.js": ["Bun.pathToFileURL", "Bun.fileURLToPath"],
  "util/concat.test.js": ["Bun.concatArrayBuffers"],
  "util/stringWidth.test.ts": ["Bun.stringWidth"],
  "util/stripANSI.test.ts": ["Bun.stripANSI"],

  // Glob
  "glob/glob.test.ts": ["Bun.Glob"],

  // Compression
  "compression/zstd.test.ts": [
    "Bun.zstdCompressSync",
    "Bun.zstdDecompressSync",
  ],

  // Crypto
  "crypto/hash.test.js": ["Bun.hash"],
  "crypto/password.test.ts": ["Bun.password"],
};

/**
 * Configuration for test runner
 */
export interface TestRunnerConfig {
  /** Path to synced tests directory */
  testsDir: string;

  /** Whether to run tests with polyfills */
  usePolyfills: boolean;

  /** Filter tests by pattern */
  filter?: string;

  /** Maximum parallel test processes */
  parallel?: number;
}

/**
 * Default test runner configuration
 */
export const DEFAULT_TEST_RUNNER_CONFIG: TestRunnerConfig = {
  testsDir: path.resolve(process.cwd(), "tests"),
  usePolyfills: true,
  parallel: 4,
};

/**
 * Parse bun test output (JSON format when available)
 */
function parseBunTestOutput(output: string): TestResult[] {
  const results: TestResult[] = [];

  // Try to parse as structured test output
  // Bun test output format: "pass|fail description (Xms)"
  const testLineRegex =
    /^\s*(pass|fail|skip|todo)\s+(.+?)\s*(?:\((\d+(?:\.\d+)?)(m?s)\))?$/gm;

  let match: RegExpExecArray | null = testLineRegex.exec(output);
  while (match !== null) {
    const [, statusStr, description, durationStr, unit] = match;
    if (!statusStr || !description) continue;

    const status = statusStr as TestResult["status"];
    let duration = 0;
    if (durationStr) {
      duration = parseFloat(durationStr);
      if (unit === "s") duration *= 1000;
    }

    // Extract suite and test name from description
    // Format: "suite > test" or just "test"
    const parts = description.split(" > ");
    const test = parts[parts.length - 1]?.trim() ?? description;
    const suite = parts.length > 1 ? parts.slice(0, -1).join(" > ").trim() : "";

    results.push({
      file: "", // Will be filled in by caller
      suite,
      test,
      status,
      duration,
    });

    match = testLineRegex.exec(output);
  }

  return results;
}

/**
 * Parse failed test errors from output
 */
function _parseTestErrors(output: string): Map<string, string> {
  const errors = new Map<string, string>();

  // Look for error patterns
  const errorBlockRegex = /(\d+)\s*\|\s*error:\s*([\s\S]*?)(?=\n\d+\s*\||$)/g;

  let match: RegExpExecArray | null = errorBlockRegex.exec(output);
  while (match !== null) {
    const testNum = match[1];
    const errorMsg = match[2]?.trim();
    if (testNum && errorMsg) {
      errors.set(testNum, errorMsg);
    }
    match = errorBlockRegex.exec(output);
  }

  return errors;
}

/**
 * Run tests in a single file
 */
async function runTestFile(
  testFile: string,
  config: TestRunnerConfig,
): Promise<TestResult[]> {
  const testPath = path.join(config.testsDir, testFile);

  if (!fs.existsSync(testPath)) {
    return [
      {
        file: testFile,
        suite: "",
        test: "file not found",
        status: "skip",
        duration: 0,
        error: `Test file not found: ${testPath}`,
      },
    ];
  }

  try {
    // Run bun test with specific file
    const proc = Bun.spawn(["bun", "test", testPath], {
      cwd: config.testsDir,
      env: {
        ...process.env,
        // Add polyfill preload if needed
        ...(config.usePolyfills ? { BUN_POLYFILL_MODE: "1" } : {}),
      },
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    // Parse test results from output
    const results = parseBunTestOutput(stdout + "\n" + stderr);

    // Add file path to all results
    for (const result of results) {
      result.file = testFile;
    }

    // If no tests parsed but process failed, create a failure result
    if (results.length === 0 && exitCode !== 0) {
      results.push({
        file: testFile,
        suite: "",
        test: "test execution",
        status: "fail",
        duration: 0,
        error: stderr || stdout || `Exit code: ${exitCode}`,
      });
    }

    // If no tests parsed and process succeeded, create a skip result
    if (results.length === 0 && exitCode === 0) {
      results.push({
        file: testFile,
        suite: "",
        test: "no tests found",
        status: "skip",
        duration: 0,
      });
    }

    return results;
  } catch (err) {
    return [
      {
        file: testFile,
        suite: "",
        test: "test execution",
        status: "fail",
        duration: 0,
        error: String(err),
      },
    ];
  }
}

/**
 * Aggregate test results by API
 */
function aggregateByApi(results: TestResult[]): TestCoverage[] {
  const apiResults = new Map<string, TestCoverage>();

  for (const result of results) {
    // Find which APIs this test covers
    const apis = TEST_TO_API_MAP[result.file] ?? [];

    for (const api of apis) {
      let coverage = apiResults.get(api);
      if (!coverage) {
        coverage = {
          api,
          testsTotal: 0,
          testsPassed: 0,
          testsFailed: 0,
          testsSkipped: 0,
          percentPassing: 0,
        };
        apiResults.set(api, coverage);
      }

      coverage.testsTotal++;
      switch (result.status) {
        case "pass":
          coverage.testsPassed++;
          break;
        case "fail":
          coverage.testsFailed++;
          break;
        case "skip":
        case "todo":
          coverage.testsSkipped++;
          break;
      }
    }
  }

  // Calculate percentages
  for (const coverage of apiResults.values()) {
    const runTests = coverage.testsTotal - coverage.testsSkipped;
    coverage.percentPassing =
      runTests > 0 ? Math.round((coverage.testsPassed / runTests) * 100) : 0;
  }

  return Array.from(apiResults.values()).sort((a, b) =>
    a.api.localeCompare(b.api),
  );
}

/**
 * Run all synced tests and collect results
 */
export async function runTests(
  config: Partial<TestRunnerConfig> = {},
): Promise<TestRunResult> {
  const fullConfig: TestRunnerConfig = {
    ...DEFAULT_TEST_RUNNER_CONFIG,
    ...config,
  };

  const startTime = Date.now();
  const allResults: TestResult[] = [];

  // Get list of test files to run
  const testFiles = Object.keys(TEST_TO_API_MAP).filter((file) => {
    if (fullConfig.filter) {
      return file.includes(fullConfig.filter);
    }
    return true;
  });

  console.log(`Running ${testFiles.length} test files...`);

  // Run tests (could be parallelized with Promise.all for speed)
  for (const testFile of testFiles) {
    console.log(`  Running: ${testFile}`);
    const results = await runTestFile(testFile, fullConfig);
    allResults.push(...results);

    // Log immediate status
    const passed = results.filter((r) => r.status === "pass").length;
    const failed = results.filter((r) => r.status === "fail").length;
    console.log(`    -> ${passed} passed, ${failed} failed`);
  }

  const duration = Date.now() - startTime;

  // Aggregate by API
  const byApi = aggregateByApi(allResults);

  // Calculate summary
  const summary = {
    total: allResults.length,
    passed: allResults.filter((r) => r.status === "pass").length,
    failed: allResults.filter((r) => r.status === "fail").length,
    skipped: allResults.filter(
      (r) => r.status === "skip" || r.status === "todo",
    ).length,
    duration,
  };

  return {
    timestamp: new Date().toISOString(),
    results: allResults,
    byApi,
    summary,
  };
}

/**
 * Get test coverage summary for display
 */
export function getTestSummary(result: TestRunResult): string {
  const lines: string[] = [];

  lines.push("=== Test Run Summary ===");
  lines.push("");
  lines.push(
    `Total: ${result.summary.total} | Passed: ${result.summary.passed} | Failed: ${result.summary.failed} | Skipped: ${result.summary.skipped}`,
  );
  lines.push(`Duration: ${result.summary.duration}ms`);
  lines.push("");
  lines.push("=== Coverage by API ===");

  for (const coverage of result.byApi) {
    const status =
      coverage.testsFailed > 0 ? "FAIL"
      : coverage.testsPassed > 0 ? "PASS"
      : "SKIP";
    lines.push(
      `  ${status.padEnd(4)} ${coverage.api}: ${coverage.testsPassed}/${coverage.testsTotal} (${coverage.percentPassing}%)`,
    );
  }

  return lines.join("\n");
}

/**
 * Save test results to JSON file
 */
export async function saveTestResults(
  result: TestRunResult,
  outputPath: string,
): Promise<void> {
  await Bun.write(outputPath, JSON.stringify(result, null, 2));
}

/**
 * Load previous test results from JSON file
 */
export function loadTestResults(inputPath: string): TestRunResult | null {
  if (!fs.existsSync(inputPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(inputPath, "utf-8");
    return JSON.parse(content) as TestRunResult;
  } catch {
    return null;
  }
}

// CLI - only run when executed directly
if (import.meta.main) {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Test Runner - Run synced Bun tests for polyfill verification

USAGE:
  bun run src/test-runner.ts [options]

OPTIONS:
  --filter <pattern>  Only run tests matching pattern
  --output <path>     Save results to JSON file
  --no-polyfills      Run without polyfills (for comparison)
  --help              Show this help message
`);
    process.exit(0);
  }

  const config: Partial<TestRunnerConfig> = {};

  // Parse args
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--filter" && args[i + 1]) {
      config.filter = args[++i];
    } else if (arg === "--no-polyfills") {
      config.usePolyfills = false;
    }
  }

  const result = await runTests(config);
  console.log("\n" + getTestSummary(result));

  // Save if output specified
  const outputIdx = args.indexOf("--output");
  if (outputIdx !== -1 && args[outputIdx + 1]) {
    const outputPath = args[outputIdx + 1] as string;
    await saveTestResults(result, outputPath);
    console.log(`\nResults saved to: ${outputPath}`);
  }
}
