#!/usr/bin/env bun
// CLI for Bun API tracker

import * as path from "node:path";

import { extractApis, flattenApis } from "./extractor.ts";
import { detectImplementations } from "./detector.ts";
import {
  generateReport,
  writeReports,
  checkCoverage,
  generateConsoleSummary,
} from "./reporter.ts";
import { generateBadges, generateEndpointJson } from "./badge.ts";

const HELP = `
Bun API Tracker - Track Bun API coverage in polyfills

USAGE:
  bun run cli.ts <command> [options]

COMMANDS:
  report      Generate full coverage report (default)
  check       Check if coverage meets threshold
  badge       Generate badge JSON for shields.io
  list        List all Bun APIs
  extract     Extract APIs from bun-types (debug)
  help        Show this help message

OPTIONS:
  --polyfills <path>    Path to polyfills source directory
  --output <path>       Output directory for reports
  --min-coverage <n>    Minimum coverage percentage for check command
  --json                Output JSON only
  --markdown            Output Markdown only
  --category <name>     Filter by category
  --module <name>       Filter by module

EXAMPLES:
  bun run cli.ts report
  bun run cli.ts check --min-coverage 10
  bun run cli.ts list --category filesystem
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
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    command: "report",
    polyfillsPath: path.resolve(process.cwd(), "../polyfills/src"),
    outputDir: path.resolve(process.cwd(), "output"),
    json: true,
    markdown: true,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg && !arg.startsWith("-")) {
      options.command = arg;
      i++;
      continue;
    }

    switch (arg) {
      case "--polyfills":
        options.polyfillsPath = args[++i] ?? options.polyfillsPath;
        break;
      case "--output":
        options.outputDir = args[++i] ?? options.outputDir;
        break;
      case "--min-coverage":
        options.minCoverage = parseInt(args[++i] ?? "0", 10);
        break;
      case "--json":
        options.json = true;
        options.markdown = false;
        break;
      case "--markdown":
        options.markdown = true;
        options.json = false;
        break;
      case "--category":
        options.category = args[++i];
        break;
      case "--module":
        options.module = args[++i];
        break;
      case "--help":
      case "-h":
        options.command = "help";
        break;
    }
    i++;
  }

  return options;
}

async function runReport(options: CliOptions): Promise<void> {
  console.log("Extracting Bun APIs from bun-types...");
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
  console.log("Extracting APIs from bun-types...\n");
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

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  switch (options.command) {
    case "report":
      await runReport(options);
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
    case "help":
    default:
      console.log(HELP);
      break;
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
