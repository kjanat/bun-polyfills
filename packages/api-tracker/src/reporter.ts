// Generate coverage reports in JSON and Markdown formats

import * as fs from "node:fs";
import * as path from "node:path";

import type {
  ApiCategory,
  ApiImplementation,
  BunModule,
  CategoryStats,
  CoverageReport,
  CoverageSummary,
  ReporterConfig,
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

  return {
    total,
    implemented,
    partial,
    stub,
    notStarted,
    percentComplete,
  };
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
    `Generated: ${new Date(report.generated).toLocaleString()} | bun-types: ${report.bunTypesVersion}`,
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
 * Write reports to disk
 */
export async function writeReports(
  report: CoverageReport,
  config: Partial<ReporterConfig> = {},
): Promise<{ json?: string; markdown?: string }> {
  const fullConfig: ReporterConfig = {
    ...DEFAULT_REPORTER_CONFIG,
    ...config,
  };

  // Ensure output directory exists
  if (!fs.existsSync(fullConfig.outputDir)) {
    fs.mkdirSync(fullConfig.outputDir, { recursive: true });
  }

  const result: { json?: string; markdown?: string } = {};

  if (fullConfig.json) {
    const jsonPath = path.join(fullConfig.outputDir, "coverage.json");
    const jsonContent = generateJsonReport(report);
    fs.writeFileSync(jsonPath, jsonContent);
    result.json = jsonPath;
  }

  if (fullConfig.markdown) {
    const mdPath = path.join(fullConfig.outputDir, "COVERAGE.md");
    const mdContent = generateMarkdownReport(report);
    fs.writeFileSync(mdPath, mdContent);
    result.markdown = mdPath;
  }

  return result;
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
