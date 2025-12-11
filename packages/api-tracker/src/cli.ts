#!/usr/bin/env bun
// CLI for Bun API tracker

import * as path from "node:path";
import { parseArgs } from "node:util";
import { generateBadges, generateEndpointJson } from "./badge.ts";
import { compareTypes, getComparisonSummary } from "./comparator.ts";
import { detectImplementations } from "./detector.ts";
import { extractApis, flattenApis } from "./extractor.ts";
import {
  checkCoverage,
  combineThreeTiers,
  generateConsoleSummary,
  generateReport,
  generateThreeTierSummary,
  writeReports,
} from "./reporter.ts";
import { getTestSummary, runTests, saveTestResults } from "./test-runner.ts";

const FILENAME = import.meta.file;

const HELP = `
Bun API Tracker - Track Bun API coverage in polyfills

USAGE:
  bun run ${FILENAME} <command> [options]

COMMANDS:
  report      Generate full coverage report (default)
  compare     Compare types between Bun and Polyfills
  run-tests   Run synced Bun tests to verify polyfill behavior
  sync-tests  Sync Bun test files for polyfill testing
  combined    Generate three-tier combined report
  check       Check if coverage meets threshold
  badge       Generate badge JSON for shields.io
  list        List all Bun APIs
  extract     Extract APIs from @types/bun (debug)
  help        Show this help message

OPTIONS:
  --polyfills <path>    Path to polyfills source directory
  --output <path>       Output directory for reports
  --min-coverage <n>    Minimum coverage percentage for check command
  --json                Output JSON only
  --markdown            Output Markdown only
  --category <name>     Filter by category
  --module <name>       Filter by module
  --dry-run             For sync-tests: show what would be done
  --filter <pattern>    For run-tests: filter tests by pattern

EXAMPLES:
  bun run ${FILENAME} report
  bun run ${FILENAME} compare
  bun run ${FILENAME} combined
  bun run ${FILENAME} run-tests --filter spawn
  bun run ${FILENAME} sync-tests --dry-run
  bun run ${FILENAME} check --min-coverage 10
  bun run ${FILENAME} list --category filesystem
`;

interface CliOptions {
  command: string;
  polyfillsPath: string;
  outputDir: string;
  minCoverage?: number;
  json: boolean;
  markdown: boolean;
  category?: string;
  module?: string;
  dryRun: boolean;
  filter?: string;
  help: boolean;
}

function getOptions(): CliOptions {
  const { values, positionals } = parseArgs({
    args: Bun.argv,
    options: {
      polyfills: { type: "string", short: "p" },
      output: { type: "string", short: "o" },
      "min-coverage": { type: "string", short: "m" },
      json: { type: "boolean", short: "j" },
      markdown: { type: "boolean" },
      category: { type: "string", short: "c" },
      module: { type: "string" },
      "dry-run": { type: "boolean", short: "d" },
      filter: { type: "string", short: "f" },
      help: { type: "boolean", short: "h" },
    },
    strict: false,
    allowPositionals: true,
  });

  // positionals[0] = bun path, positionals[1] = script path, positionals[2] = command
  const command = positionals[2] ?? "report";
  const polyfills = values.polyfills as string | undefined;
  const output = values.output as string | undefined;
  const minCov = values["min-coverage"] as string | undefined;
  const category = values.category as string | undefined;
  const mod = values.module as string | undefined;
  const filter = values.filter as string | undefined;

  return {
    command,
    polyfillsPath: polyfills ?? path.resolve(process.cwd(), "../polyfills/src"),
    outputDir: output ?? path.resolve(process.cwd(), "output"),
    minCoverage: minCov ? parseInt(minCov, 10) : undefined,
    json: (values.json as boolean) ?? !(values.markdown as boolean),
    markdown: (values.markdown as boolean) ?? !(values.json as boolean),
    category,
    module: mod,
    dryRun: (values["dry-run"] as boolean) ?? false,
    filter,
    help: (values.help as boolean) ?? false,
  };
}

async function runReport(options: CliOptions): Promise<void> {
  console.log("Extracting Bun APIs from @types/bun...");
  const extraction = await extractApis();
  console.log(`Found ${extraction.apis.length} top-level APIs`);

  const allApis = flattenApis(extraction.apis);
  console.log(`Total APIs (including children): ${allApis.length}`);

  console.log("\nDetecting implementations...");
  const detection = await detectImplementations(allApis, {
    polyfillsPath: options.polyfillsPath,
  });
  console.log(`Scanned ${detection.filesScanned.length} files`);

  if (detection.warnings.length > 0) {
    console.log("\nWarnings:");
    for (const warning of detection.warnings) {
      console.log(`  - ${warning}`);
    }
  }

  const report = generateReport(detection.implementations, extraction.version);
  console.log(generateConsoleSummary(report));

  const paths = await writeReports(report, {
    outputDir: options.outputDir,
    json: options.json,
    markdown: options.markdown,
  });

  console.log("Reports written to:");
  if (paths.json) console.log(`  - ${paths.json}`);
  if (paths.markdown) console.log(`  - ${paths.markdown}`);
}

async function runCheck(options: CliOptions): Promise<void> {
  const minCoverage = options.minCoverage ?? 5;

  const extraction = await extractApis();
  const allApis = flattenApis(extraction.apis);
  const detection = await detectImplementations(allApis, {
    polyfillsPath: options.polyfillsPath,
  });
  const report = generateReport(detection.implementations, extraction.version);

  const result = checkCoverage(report, minCoverage);

  console.log(`Coverage: ${result.actual}% (required: ${result.required}%)`);

  if (result.passed) {
    console.log("PASSED");
    process.exit(0);
  } else {
    console.log("FAILED");
    process.exit(1);
  }
}

async function runList(options: CliOptions): Promise<void> {
  const extraction = await extractApis();
  let apis = flattenApis(extraction.apis);

  if (options.category) {
    apis = apis.filter((api) => api.category === options.category);
  }

  if (options.module) {
    apis = apis.filter((api) => api.module === options.module);
  }

  console.log(`\nBun APIs (${apis.length}):\n`);

  for (const api of apis) {
    const kind = api.kind.padEnd(10);
    const category = api.category.padEnd(12);
    console.log(`  ${kind} ${category} ${api.fullPath}`);
  }
}

async function runBadge(options: CliOptions): Promise<void> {
  const extraction = await extractApis();
  const allApis = flattenApis(extraction.apis);
  const detection = await detectImplementations(allApis, {
    polyfillsPath: options.polyfillsPath,
  });
  const report = generateReport(detection.implementations, extraction.version);

  // Write endpoint JSON for shields.io
  const badgeJsonPath = path.join(options.outputDir, "badge.json");
  await Bun.write(badgeJsonPath, generateEndpointJson(report));

  // Generate badge URLs
  const badges = generateBadges(report);

  console.log("Badge JSON written to:", badgeJsonPath);
  console.log("\nBadge URLs:");
  console.log(`  Coverage: ${badges.coverage}`);
  console.log(`  Implemented: ${badges.implemented}`);
  console.log("\nMarkdown:");
  console.log(`  ${badges.markdown}`);
}

async function runExtract(_options: CliOptions): Promise<void> {
  console.log("Extracting APIs from @types/bun...\n");
  const extraction = await extractApis();

  console.log(`Version: ${extraction.version}`);
  console.log(`Timestamp: ${extraction.timestamp}`);
  console.log(`Top-level APIs: ${extraction.apis.length}`);
  console.log(`Total (flattened): ${flattenApis(extraction.apis).length}`);

  if (extraction.warnings.length > 0) {
    console.log("\nWarnings:");
    for (const warning of extraction.warnings) {
      console.log(`  - ${warning}`);
    }
  }

  console.log("\nTop-level APIs:");
  for (const api of extraction.apis.slice(0, 20)) {
    console.log(`  - ${api.fullPath} (${api.kind}, ${api.category})`);
  }
  if (extraction.apis.length > 20) {
    console.log(`  ... and ${extraction.apis.length - 20} more`);
  }
}

async function runCompare(options: CliOptions): Promise<void> {
  console.log("Comparing Bun types against Polyfill types...\n");

  const polyfillTypesPath = path.join(options.polyfillsPath, "types.ts");

  try {
    const comparison = await compareTypes({
      polyfillTypesPath,
      strictSignatures: true,
    });

    console.log(getComparisonSummary(comparison));

    // Write comparison result to JSON
    const comparisonJsonPath = path.join(options.outputDir, "comparison.json");
    await Bun.write(comparisonJsonPath, JSON.stringify(comparison, null, 2));
    console.log(`\nComparison result written to: ${comparisonJsonPath}`);
  } catch (err) {
    console.error("Comparison failed:", err);
    process.exit(1);
  }
}

async function runSyncTests(options: CliOptions): Promise<void> {
  const { syncTests } = await import("./test-sync.ts");
  await syncTests({ dryRun: options.dryRun });
}

async function runTestsCommand(options: CliOptions): Promise<void> {
  console.log("Running synced Bun tests for polyfill verification...\n");

  const testsDir = path.resolve(options.outputDir, "..", "tests");
  const result = await runTests({
    testsDir,
    usePolyfills: true,
    filter: options.filter,
  });

  console.log(`\n${getTestSummary(result)}`);

  // Save results to JSON
  const testResultsPath = path.join(options.outputDir, "test-results.json");
  await saveTestResults(result, testResultsPath);
  console.log(`\nTest results saved to: ${testResultsPath}`);
}

async function runCombined(options: CliOptions): Promise<void> {
  console.log("Generating three-tier combined coverage report...\n");

  const polyfillTypesPath = path.join(options.polyfillsPath, "types.ts");
  const annotationsPath = path.join(process.cwd(), "data", "annotations.json");
  const _testsDir = path.resolve(options.outputDir, "..", "tests");

  // Tier 1: Type comparison
  console.log("Tier 1: Running type comparison...");
  const comparison = await compareTypes({
    polyfillTypesPath,
    strictSignatures: true,
  });

  // Tier 2: Test results (optional - may not have synced tests)
  console.log("Tier 2: Checking for test results...");
  let testResults = null;
  try {
    const testResultsPath = path.join(options.outputDir, "test-results.json");
    const content = await Bun.file(testResultsPath).text();
    testResults = JSON.parse(content);
    console.log(`  Loaded ${testResults.summary.total} test results`);
  } catch {
    console.log("  No existing test results found (run 'run-tests' first)");
  }

  // Tier 3: Combine with annotations
  console.log("Tier 3: Applying annotations...");
  const combined = combineThreeTiers(comparison, testResults, annotationsPath);

  console.log(`\n${generateThreeTierSummary(combined)}`);

  // Save combined results
  const combinedPath = path.join(options.outputDir, "combined-coverage.json");
  await Bun.write(
    combinedPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        comparison,
        testResults,
        combined,
      },
      null,
      2,
    ),
  );
  console.log(`\nCombined report written to: ${combinedPath}`);
}

async function main(): Promise<void> {
  const options = getOptions();

  if (options.help || options.command === "help") {
    console.log(HELP);
    return;
  }

  switch (options.command) {
    case "report":
      await runReport(options);
      break;
    case "compare":
      await runCompare(options);
      break;
    case "run-tests":
      await runTestsCommand(options);
      break;
    case "sync-tests":
      await runSyncTests(options);
      break;
    case "combined":
      await runCombined(options);
      break;
    case "check":
      await runCheck(options);
      break;
    case "badge":
      await runBadge(options);
      break;
    case "list":
      await runList(options);
      break;
    case "extract":
      await runExtract(options);
      break;
    default:
      console.log(`Unknown command: ${options.command}`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
