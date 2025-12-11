// @kjanat/bun-api-tracker - Automated Bun API detection and coverage tracking
//
// Usage:
//   import { extractApis, detectImplementations, generateReport } from "@kjanat/bun-api-tracker";
//
//   const extraction = await extractApis();
//   const detection = await detectImplementations(extraction.apis, { polyfillsPath: "./src" });
//   const report = generateReport(detection.implementations, extraction.version);

// Re-export all types
export * from "./types.ts";

// Extractor
export {
  extractApis,
  flattenApis,
  getTopLevelApis,
  filterByCategory,
  filterByModule,
  resolveBunTypesPath,
  getBunTypesVersion,
  getApiKind,
  DEFAULT_EXTRACTOR_CONFIG,
} from "./extractor.ts";

// Detector
export {
  detectImplementations,
  getTypeComparison,
  loadAnnotations,
  loadManualOverrides, // deprecated alias for loadAnnotations
  getImplementationSummary,
  filterByStatus,
  sortByCompleteness,
  DEFAULT_DETECTOR_CONFIG,
} from "./detector.ts";

// Comparator (new automated type comparison)
export {
  compareTypes,
  getComparisonSummary,
  type ComparatorConfig,
} from "./comparator.ts";

// Interface mapping
export { INTERFACE_MAP, SPECIAL_APIS } from "./interface-map.ts";

// Reporter
export {
  generateReport,
  generateJsonReport,
  generateMarkdownReport,
  writeReports,
  checkCoverage,
  calculateSummary,
  calculateByCategory,
  calculateByModule,
  generateConsoleSummary,
  DEFAULT_REPORTER_CONFIG,
} from "./reporter.ts";

// Badge
export {
  generateBadges,
  generateBadgeUrl,
  generateBadgeData,
  generateEndpointJson,
  type BadgeOptions,
  type BadgeUrls,
} from "./badge.ts";

// Convenience function for full pipeline
import { extractApis, flattenApis } from "./extractor.ts";
import { detectImplementations } from "./detector.ts";
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
