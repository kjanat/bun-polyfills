// Badge generation for coverage reports

import type { CoverageReport, CoverageSummary } from "./types.ts";

export interface BadgeOptions {
  /** Badge label (left side) */
  label?: string;
  /** Badge style: flat, flat-square, plastic, for-the-badge */
  style?: "flat" | "flat-square" | "plastic" | "for-the-badge";
  /** Custom logo */
  logo?: string;
  /** Logo color */
  logoColor?: string;
}

export interface BadgeUrls {
  /** shields.io URL for coverage badge */
  coverage: string;
  /** shields.io URL for implemented count */
  implemented: string;
  /** Markdown badge string */
  markdown: string;
  /** HTML badge string */
  html: string;
}

/**
 * Get color based on percentage
 */
function getColor(percent: number): string {
  if (percent >= 80) return "brightgreen";
  if (percent >= 60) return "green";
  if (percent >= 40) return "yellow";
  if (percent >= 20) return "orange";
  return "red";
}

/**
 * Generate shields.io badge URL
 */
export function generateBadgeUrl(
  label: string,
  message: string,
  color: string,
  options: BadgeOptions = {},
): string {
  const { style = "flat", logo, logoColor } = options;

  const params = new URLSearchParams();
  params.set("style", style);
  if (logo) params.set("logo", logo);
  if (logoColor) params.set("logoColor", logoColor);

  const encodedLabel = encodeURIComponent(label);
  const encodedMessage = encodeURIComponent(message);

  return `https://img.shields.io/badge/${encodedLabel}-${encodedMessage}-${color}?${params.toString()}`;
}

/**
 * Generate all badge URLs for a coverage report
 */
export function generateBadges(
  report: CoverageReport,
  options: BadgeOptions = {},
): BadgeUrls {
  const { summary } = report;
  const percent = Math.round(summary.percentComplete);
  const color = getColor(percent);

  const defaultOptions: BadgeOptions = {
    style: "flat",
    logo: "bun",
    logoColor: "white",
    ...options,
  };

  const coverageUrl = generateBadgeUrl(
    options.label ?? "Bun API Coverage",
    `${percent}%`,
    color,
    defaultOptions,
  );

  const implementedUrl = generateBadgeUrl(
    "APIs Implemented",
    `${summary.implemented}/${summary.total}`,
    color,
    defaultOptions,
  );

  const markdown = `[![Bun API Coverage](${coverageUrl})](./packages/api-tracker/output/COVERAGE.md)`;
  const html = `<a href="./packages/api-tracker/output/COVERAGE.md"><img src="${coverageUrl}" alt="Bun API Coverage"></a>`;

  return { coverage: coverageUrl, implemented: implementedUrl, markdown, html };
}

/**
 * Generate badge data for embedding in JSON
 * Uses shields.io endpoint badge schema: https://shields.io/badges/endpoint-badge
 */
export function generateBadgeData(summary: CoverageSummary): {
  schemaVersion: 1;
  label: string;
  message: string;
  color: string;
  namedLogo: string;
} {
  const percent = Math.round(summary.percentComplete);
  return {
    schemaVersion: 1,
    label: "Bun API Coverage",
    message: `${percent}%`,
    color: getColor(percent),
    namedLogo: "bun",
  };
}

/**
 * Generate endpoint JSON for shields.io dynamic badge
 */
export function generateEndpointJson(report: CoverageReport): string {
  return JSON.stringify(generateBadgeData(report.summary), null, 2);
}

export default generateBadges;
