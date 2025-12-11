// @kjanat/bun-api-tracker - Automated Bun API detection and coverage tracking
//
// Usage:
//   import { extractApis, detectImplementations, generateReport } from "@kjanat/bun-api-tracker";
//
//   const extraction = await extractApis();
//   const detection = await detectImplementations(extraction.apis, { polyfillsPath: "./src" });
//   const report = generateReport(detection.implementations, extraction.version);

// Badge
export {
  type BadgeOptions,
  type BadgeUrls,
  generateBadgeData,
  generateBadges,
  generateBadgeUrl,
  generateEndpointJson,
} from "./badge.ts";
// Comparator (new automated type comparison)
export {
  type ComparatorConfig,
  compareTypes,
  getComparisonSummary,
} from "./comparator.ts";

// Detector
export {
  DEFAULT_DETECTOR_CONFIG,
  detectImplementations,
  filterByStatus,
  getImplementationSummary,
  getTypeComparison,
  loadAnnotations,
  loadManualOverrides, // deprecated alias for loadAnnotations
  sortByCompleteness,
} from "./detector.ts";
// Extractor
export {
  DEFAULT_EXTRACTOR_CONFIG,
  extractApis,
  filterByCategory,
  filterByModule,
  flattenApis,
  getApiKind,
  getBunTypesVersion,
  getTopLevelApis,
  resolveBunTypesPath,
} from "./extractor.ts";

// Interface mapping
export { INTERFACE_MAP, SPECIAL_APIS } from "./interface-map.ts";

// Reporter
export {
  calculateByCategory,
  calculateByModule,
  calculateSummary,
  checkCoverage,
  DEFAULT_REPORTER_CONFIG,
  generateConsoleSummary,
  generateJsonReport,
  generateMarkdownReport,
  generateReport,
  writeReports,
} from "./reporter.ts";
// Re-export all types
export * from "./types.ts";

import { detectImplementations } from "./detector.ts";
// Convenience function for full pipeline
import { extractApis, flattenApis } from "./extractor.ts";
import { generateReport, writeReports } from "./reporter.ts";
import type { CoverageReport, TrackerConfig } from "./types.ts";

/**
 * Run full coverage tracking pipeline
 */
export async function trackCoverage(
  config: Partial<TrackerConfig> = {},
): Promise<CoverageReport> {
  // Extract APIs
  const extraction = await extractApis(config.extractor);
  const allApis = flattenApis(extraction.apis);

  // Detect implementations
  const detection = await detectImplementations(allApis, config.detector);

  // Generate report
  const report = generateReport(detection.implementations, extraction.version);

  // Write reports if output config provided
  if (config.reporter) {
    await writeReports(report, config.reporter);
  }

  return report;
}

export default trackCoverage;
