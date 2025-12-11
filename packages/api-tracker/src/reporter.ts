// Generate coverage reports in JSON and Markdown formats
// Supports three-tier verification: Type Comparison -> Test Results -> Annotations

import * as fs from "node:fs";
import * as path from "node:path";

import type {
  ApiAnnotation,
  ApiCategory,
  ApiImplementation,
  ApiStatus,
  BunModule,
  CategoryStats,
  CombinedApiCoverage,
  ComparisonResult,
  CoverageReport,
  CoverageSummary,
  ReporterConfig,
  TestRunResult,
} from "./types.ts";

/** Default reporter configuration */
export const DEFAULT_REPORTER_CONFIG: ReporterConfig = {
  outputDir: "./output",
  json: true,
  markdown: true,
  minCoverage: undefined,
};

/** Status emoji mapping */
const STATUS_EMOJI: Record<string, string> = {
  implemented: ":white_check_mark:",
  partial: ":yellow_circle:",
  stub: ":construction:",
  "not-started": ":x:",
};

/** Status labels */
const STATUS_LABELS: Record<string, string> = {
  implemented: "Implemented",
  partial: "Partial",
  stub: "Stub",
  "not-started": "Not Started",
};

/**
 * Calculate summary statistics
 */
export function calculateSummary(
  implementations: Map<string, ApiImplementation>,
): CoverageSummary {
  let implemented = 0;
  let partial = 0;
  let stub = 0;
  let notStarted = 0;

  for (const impl of implementations.values()) {
    switch (impl.status) {
      case "implemented":
        implemented++;
        break;
      case "partial":
        partial++;
        break;
      case "stub":
        stub++;
        break;
      case "not-started":
        notStarted++;
        break;
    }
  }

  const total = implementations.size;
  const percentComplete =
    total > 0 ? Math.round(((implemented + partial * 0.5) / total) * 100) : 0;

  return { total, implemented, partial, stub, notStarted, percentComplete };
}

/**
 * Calculate statistics by category
 */
export function calculateByCategory(
  implementations: Map<string, ApiImplementation>,
): Record<ApiCategory, CategoryStats> {
  const stats: Record<string, CategoryStats> = {};

  for (const impl of implementations.values()) {
    const category = impl.api.category;
    if (!stats[category]) {
      stats[category] = {
        total: 0,
        implemented: 0,
        partial: 0,
        stub: 0,
        notStarted: 0,
        percentComplete: 0,
      };
    }

    stats[category].total++;
    switch (impl.status) {
      case "implemented":
        stats[category].implemented++;
        break;
      case "partial":
        stats[category].partial++;
        break;
      case "stub":
        stats[category].stub++;
        break;
      case "not-started":
        stats[category].notStarted++;
        break;
    }
  }

  // Calculate percentages
  for (const category of Object.keys(stats)) {
    const s = stats[category];
    if (s && s.total > 0) {
      s.percentComplete = Math.round(
        ((s.implemented + s.partial * 0.5) / s.total) * 100,
      );
    }
  }

  return stats as Record<ApiCategory, CategoryStats>;
}

/**
 * Calculate statistics by module
 */
export function calculateByModule(
  implementations: Map<string, ApiImplementation>,
): Record<BunModule, CategoryStats> {
  const stats: Record<string, CategoryStats> = {};

  for (const impl of implementations.values()) {
    const module = impl.api.module;
    if (!stats[module]) {
      stats[module] = {
        total: 0,
        implemented: 0,
        partial: 0,
        stub: 0,
        notStarted: 0,
        percentComplete: 0,
      };
    }

    stats[module].total++;
    switch (impl.status) {
      case "implemented":
        stats[module].implemented++;
        break;
      case "partial":
        stats[module].partial++;
        break;
      case "stub":
        stats[module].stub++;
        break;
      case "not-started":
        stats[module].notStarted++;
        break;
    }
  }

  // Calculate percentages
  for (const module of Object.keys(stats)) {
    const s = stats[module];
    if (s && s.total > 0) {
      s.percentComplete = Math.round(
        ((s.implemented + s.partial * 0.5) / s.total) * 100,
      );
    }
  }

  return stats as Record<BunModule, CategoryStats>;
}

/**
 * Generate full coverage report
 */
export function generateReport(
  implementations: Map<string, ApiImplementation>,
  bunTypesVersion: string,
): CoverageReport {
  return {
    logo: "bun",
    generated: new Date().toISOString(),
    bunTypesVersion,
    summary: calculateSummary(implementations),
    byCategory: calculateByCategory(implementations),
    byModule: calculateByModule(implementations),
    apis: Array.from(implementations.values()),
  };
}

/**
 * Generate JSON report
 */
export function generateJsonReport(report: CoverageReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Generate Markdown report
 */
export function generateMarkdownReport(report: CoverageReport): string {
  const lines: string[] = [];

  // Header
  lines.push("# Bun API Coverage Report");
  lines.push("");
  lines.push(
    `Generated: ${new Date(report.generated).toLocaleString()} | @types/bun: ${report.bunTypesVersion}`,
  );
  lines.push("");

  // Summary table
  lines.push("## Summary");
  lines.push("");
  lines.push("| Status | Count | % |");
  lines.push("|--------|-------|---|");
  lines.push(
    `| ${STATUS_EMOJI["implemented"]} Implemented | ${report.summary.implemented} | ${Math.round((report.summary.implemented / report.summary.total) * 100)}% |`,
  );
  lines.push(
    `| ${STATUS_EMOJI["partial"]} Partial | ${report.summary.partial} | ${Math.round((report.summary.partial / report.summary.total) * 100)}% |`,
  );
  lines.push(
    `| ${STATUS_EMOJI["stub"]} Stub | ${report.summary.stub} | ${Math.round((report.summary.stub / report.summary.total) * 100)}% |`,
  );
  lines.push(
    `| ${STATUS_EMOJI["not-started"]} Not Started | ${report.summary.notStarted} | ${Math.round((report.summary.notStarted / report.summary.total) * 100)}% |`,
  );
  lines.push(`| **Total** | **${report.summary.total}** | - |`);
  lines.push("");
  lines.push(`**Overall Progress: ${report.summary.percentComplete}%**`);
  lines.push("");

  // Progress by category
  lines.push("## Progress by Category");
  lines.push("");

  const categories = Object.entries(report.byCategory)
    .filter(([, stats]) => stats.total > 0)
    .sort((a, b) => b[1].percentComplete - a[1].percentComplete);

  for (const [category, stats] of categories) {
    const categoryTitle =
      category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, " ");
    const progress = `${stats.implemented}/${stats.total}`;
    const percent = `${stats.percentComplete}%`;

    lines.push(`### ${categoryTitle} (${progress} - ${percent})`);
    lines.push("");
    lines.push("| API | Status | Notes |");
    lines.push("|-----|--------|-------|");

    // Get APIs for this category
    const categoryApis = report.apis
      .filter((impl) => impl.api.category === category)
      .sort((a, b) => {
        // Sort by status (implemented first)
        const statusOrder = {
          implemented: 0,
          partial: 1,
          stub: 2,
          "not-started": 3,
        };
        return statusOrder[a.status] - statusOrder[b.status];
      });

    for (const impl of categoryApis) {
      const emoji = STATUS_EMOJI[impl.status];
      const label = STATUS_LABELS[impl.status];
      const notes = impl.notes ?? "";
      lines.push(`| \`${impl.api.fullPath}\` | ${emoji} ${label} | ${notes} |`);
    }

    lines.push("");
  }

  // Progress by module
  lines.push("## Progress by Module");
  lines.push("");
  lines.push("| Module | Total | Implemented | Partial | Progress |");
  lines.push("|--------|-------|-------------|---------|----------|");

  for (const [module, stats] of Object.entries(report.byModule)) {
    if (stats.total > 0) {
      lines.push(
        `| \`${module}\` | ${stats.total} | ${stats.implemented} | ${stats.partial} | ${stats.percentComplete}% |`,
      );
    }
  }

  lines.push("");

  // Legend
  lines.push("## Legend");
  lines.push("");
  lines.push(
    `- ${STATUS_EMOJI["implemented"]} **Implemented**: Fully working polyfill`,
  );
  lines.push(`- ${STATUS_EMOJI["partial"]} **Partial**: Some features missing`);
  lines.push(
    `- ${STATUS_EMOJI["stub"]} **Stub**: Exists but may throw or no-op`,
  );
  lines.push(
    `- ${STATUS_EMOJI["not-started"]} **Not Started**: No implementation yet`,
  );
  lines.push("");

  return lines.join("\n");
}

/**
 * Format content with Prettier
 */
async function formatWithPrettier(
  content: string,
  filepath: string,
): Promise<string> {
  try {
    const prettier = await import("prettier");
    const options = await prettier.resolveConfig(filepath);
    return prettier.format(content, { ...options, filepath });
  } catch {
    // Prettier not available or failed, return unformatted
    return content;
  }
}

/**
 * Write reports to disk
 */
export async function writeReports(
  report: CoverageReport,
  config: Partial<ReporterConfig> = {},
): Promise<{ json?: string; markdown?: string }> {
  const fullConfig: ReporterConfig = { ...DEFAULT_REPORTER_CONFIG, ...config };

  // Ensure output directory exists
  if (!fs.existsSync(fullConfig.outputDir)) {
    fs.mkdirSync(fullConfig.outputDir, { recursive: true });
  }

  const result: { json?: string; markdown?: string } = {};

  if (fullConfig.json) {
    const jsonPath = path.join(fullConfig.outputDir, "coverage.json");
    const jsonContent = generateJsonReport(report);
    const formatted = await formatWithPrettier(jsonContent, jsonPath);
    fs.writeFileSync(jsonPath, formatted);
    result.json = jsonPath;
  }

  if (fullConfig.markdown) {
    const mdPath = path.join(fullConfig.outputDir, "COVERAGE.md");
    const mdContent = generateMarkdownReport(report);
    const formatted = await formatWithPrettier(mdContent, mdPath);
    fs.writeFileSync(mdPath, formatted);
    result.markdown = mdPath;
  }

  return result;
}

// ============================================================================
// Three-Tier Reporting System
// ============================================================================

/**
 * Load annotations from JSON file
 */
function loadAnnotations(annotationsPath: string): Map<string, ApiAnnotation> {
  const annotations = new Map<string, ApiAnnotation>();

  if (!fs.existsSync(annotationsPath)) {
    return annotations;
  }

  try {
    const data = JSON.parse(fs.readFileSync(annotationsPath, "utf-8"));
    if (Array.isArray(data)) {
      for (const annotation of data as ApiAnnotation[]) {
        if (annotation.fullPath) {
          annotations.set(annotation.fullPath, annotation);
        }
      }
    }
  } catch {
    // Ignore parse errors
  }

  return annotations;
}

/**
 * Combine type comparison, test results, and annotations into final coverage
 * Each tier can only reduce confidence, never inflate it
 *
 * Tier 1: Type Comparison (auto-detected from TS types)
 * Tier 2: Test Results (runtime verification)
 * Tier 3: Annotations (human notes, can only cap)
 */
export function combineThreeTiers(
  comparison: ComparisonResult,
  testResults: TestRunResult | null,
  annotationsPath: string,
): CombinedApiCoverage[] {
  const annotations = loadAnnotations(annotationsPath);
  const combined: CombinedApiCoverage[] = [];

  // Build test results lookup
  const testsByApi = new Map<string, TestRunResult["byApi"][number]>();
  if (testResults) {
    for (const coverage of testResults.byApi) {
      testsByApi.set(coverage.api, coverage);
    }
  }

  // Process each member from type comparison
  for (const iface of comparison.interfaces) {
    for (const member of iface.members) {
      const annotation = annotations.get(member.fullPath);
      const testCoverage = testsByApi.get(member.fullPath);

      // Start with type comparison status
      let completeness = statusToCompleteness(member.status);
      let status: ApiStatus = comparisonStatusToApiStatus(member.status);
      const signatureMatch =
        member.status === "implemented" && !member.signatureDiff;

      // Tier 2: Apply test results (can only reduce)
      if (testCoverage && testCoverage.testsTotal > 0) {
        const testCompleteness = testCoverage.percentPassing;
        // Tests can reduce but not increase completeness
        if (testCompleteness < completeness) {
          completeness = testCompleteness;
          status = completenessToStatus(completeness);
        }
      }

      // Tier 3: Apply annotation cap (can only reduce)
      if (annotation?.maxCompleteness !== undefined) {
        if (annotation.maxCompleteness < completeness) {
          completeness = annotation.maxCompleteness;
          status = completenessToStatus(completeness);
        }
      }

      // If requires native Bun, cap at 0
      if (annotation?.requiresNativeBun) {
        completeness = 0;
        status = "not-started";
      }

      combined.push({
        fullPath: member.fullPath,
        typeStatus: member.status,
        signatureMatch,
        testResults:
          testCoverage ?
            {
              total: testCoverage.testsTotal,
              passed: testCoverage.testsPassed,
              failed: testCoverage.testsFailed,
              skipped: testCoverage.testsSkipped,
              percentPassing: testCoverage.percentPassing,
            }
          : undefined,
        annotation,
        completeness,
        status,
      });
    }
  }

  return combined;
}

/**
 * Convert comparison status to initial completeness
 */
function statusToCompleteness(
  status: "implemented" | "partial" | "missing",
): number {
  switch (status) {
    case "implemented":
      return 100;
    case "partial":
      return 50;
    case "missing":
      return 0;
  }
}

/**
 * Convert comparison status to ApiStatus
 */
function comparisonStatusToApiStatus(
  status: "implemented" | "partial" | "missing",
): ApiStatus {
  switch (status) {
    case "implemented":
      return "implemented";
    case "partial":
      return "partial";
    case "missing":
      return "not-started";
  }
}

/**
 * Convert completeness percentage back to status
 */
function completenessToStatus(completeness: number): ApiStatus {
  if (completeness >= 90) return "implemented";
  if (completeness >= 30) return "partial";
  if (completeness > 0) return "stub";
  return "not-started";
}

/**
 * Generate three-tier coverage summary
 */
export function generateThreeTierSummary(
  coverage: CombinedApiCoverage[],
): string {
  const lines: string[] = [];

  const total = coverage.length;
  const implemented = coverage.filter((c) => c.status === "implemented").length;
  const partial = coverage.filter((c) => c.status === "partial").length;
  const stub = coverage.filter((c) => c.status === "stub").length;
  const notStarted = coverage.filter((c) => c.status === "not-started").length;

  const avgCompleteness =
    total > 0 ?
      Math.round(coverage.reduce((sum, c) => sum + c.completeness, 0) / total)
    : 0;

  lines.push("=== Three-Tier Coverage Summary ===");
  lines.push("");
  lines.push(`Total APIs:     ${total}`);
  lines.push(`Implemented:    ${implemented}`);
  lines.push(`Partial:        ${partial}`);
  lines.push(`Stub:           ${stub}`);
  lines.push(`Not Started:    ${notStarted}`);
  lines.push("");
  lines.push(`Avg Completeness: ${avgCompleteness}%`);
  lines.push("");

  // Show APIs with test results that reduced their score
  const reducedByTests = coverage.filter(
    (c) =>
      c.testResults &&
      c.testResults.percentPassing < statusToCompleteness(c.typeStatus),
  );

  if (reducedByTests.length > 0) {
    lines.push("APIs reduced by test failures:");
    for (const c of reducedByTests.slice(0, 10)) {
      lines.push(
        `  ${c.fullPath}: type=${c.typeStatus} -> tests=${c.testResults?.percentPassing}%`,
      );
    }
    if (reducedByTests.length > 10) {
      lines.push(`  ... and ${reducedByTests.length - 10} more`);
    }
    lines.push("");
  }

  // Show APIs with annotation caps
  const cappedByAnnotation = coverage.filter(
    (c) =>
      c.annotation?.maxCompleteness !== undefined &&
      c.annotation.maxCompleteness < statusToCompleteness(c.typeStatus),
  );

  if (cappedByAnnotation.length > 0) {
    lines.push("APIs capped by annotations:");
    for (const c of cappedByAnnotation.slice(0, 10)) {
      lines.push(
        `  ${c.fullPath}: capped to ${c.annotation?.maxCompleteness}% - ${c.annotation?.notes ?? ""}`,
      );
    }
    if (cappedByAnnotation.length > 10) {
      lines.push(`  ... and ${cappedByAnnotation.length - 10} more`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Generate three-tier markdown report
 */
export function generateThreeTierMarkdown(
  coverage: CombinedApiCoverage[],
  comparison: ComparisonResult,
): string {
  const lines: string[] = [];

  lines.push("# Bun API Coverage Report (Three-Tier Verification)");
  lines.push("");
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push("");

  // Summary
  const total = coverage.length;
  const implemented = coverage.filter((c) => c.status === "implemented").length;
  const partial = coverage.filter((c) => c.status === "partial").length;
  const notStarted = coverage.filter((c) => c.status === "not-started").length;

  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");
  lines.push(`| Total APIs | ${total} |`);
  lines.push(
    `| Implemented | ${implemented} (${Math.round((implemented / total) * 100)}%) |`,
  );
  lines.push(
    `| Partial | ${partial} (${Math.round((partial / total) * 100)}%) |`,
  );
  lines.push(
    `| Not Started | ${notStarted} (${Math.round((notStarted / total) * 100)}%) |`,
  );
  lines.push("");

  // By Interface
  lines.push("## Coverage by Interface");
  lines.push("");

  for (const iface of comparison.interfaces) {
    const ifaceMembers = coverage.filter((c) =>
      c.fullPath.startsWith(`${iface.bunInterface}.`),
    );
    const ifaceImpl = ifaceMembers.filter(
      (c) => c.status === "implemented",
    ).length;

    lines.push(
      `### ${iface.bunInterface} -> ${iface.polyfillInterface ?? "(not implemented)"}`,
    );
    lines.push("");
    lines.push(
      `Progress: ${ifaceImpl}/${ifaceMembers.length} (${iface.stats.percentComplete}%)`,
    );
    lines.push("");

    if (ifaceMembers.length > 0) {
      lines.push("| API | Type Status | Tests | Final |");
      lines.push("|-----|-------------|-------|-------|");

      for (const member of ifaceMembers) {
        const typeEmoji =
          member.typeStatus === "implemented" ? ":white_check_mark:"
          : member.typeStatus === "partial" ? ":yellow_circle:"
          : ":x:";
        const testStatus =
          member.testResults ?
            `${member.testResults.passed}/${member.testResults.total}`
          : "-";
        const finalEmoji =
          member.status === "implemented" ? ":white_check_mark:"
          : member.status === "partial" ? ":yellow_circle:"
          : member.status === "stub" ? ":construction:"
          : ":x:";

        lines.push(
          `| \`${member.fullPath}\` | ${typeEmoji} | ${testStatus} | ${finalEmoji} ${member.completeness}% |`,
        );
      }
      lines.push("");
    }
  }

  // Verification Tiers explanation
  lines.push("## Verification Tiers");
  lines.push("");
  lines.push(
    "1. **Type Comparison** (Tier 1): Automated comparison of TypeScript types",
  );
  lines.push(
    "2. **Test Results** (Tier 2): Runtime verification from Bun test suite",
  );
  lines.push(
    "3. **Annotations** (Tier 3): Human notes and caps (can only reduce)",
  );
  lines.push("");
  lines.push("Each tier can only reduce confidence, never inflate it.");
  lines.push("");

  return lines.join("\n");
}

/**
 * Check if coverage meets minimum threshold
 */
export function checkCoverage(
  report: CoverageReport,
  minCoverage: number,
): { passed: boolean; actual: number; required: number } {
  return {
    passed: report.summary.percentComplete >= minCoverage,
    actual: report.summary.percentComplete,
    required: minCoverage,
  };
}

/**
 * Generate a simple console summary
 */
export function generateConsoleSummary(report: CoverageReport): string {
  const lines: string[] = [];

  lines.push("");
  lines.push("=== Bun API Coverage Report ===");
  lines.push("");
  lines.push(`Total APIs:     ${report.summary.total}`);
  lines.push(`Implemented:    ${report.summary.implemented}`);
  lines.push(`Partial:        ${report.summary.partial}`);
  lines.push(`Not Started:    ${report.summary.notStarted}`);
  lines.push("");
  lines.push(`Progress:       ${report.summary.percentComplete}%`);
  lines.push("");

  return lines.join("\n");
}
