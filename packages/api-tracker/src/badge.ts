// Badge generation for coverage reports

import type { CoverageReport, CoverageSummary } from "./types.ts";

export type BadgeStyle =
  | "flat"
  | "flat-square"
  | "plastic"
  | "for-the-badge"
  | "social";

export interface BadgeOptions {
  /** Badge label (left side) */
  label?: string;
  /** shields.io badge style */
  style?: BadgeStyle;
  /** Custom logo slug (simple-icons) */
  logo?: string;
  /** Logo color */
  logoColor?: string;
  /** Background color for the label (left) */
  labelColor?: string;
  /** Adaptive logo sizing ("auto") or pixel size */
  logoSize?: string;
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
  if (options.labelColor) params.set("labelColor", options.labelColor);
  if (options.logoSize) params.set("logoSize", options.logoSize);

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
export type EndpointBadgeData = {
  schemaVersion: 1;
  label: string;
  message: string;
  color: string;
} & Partial<{
  labelColor: string;
  isError: boolean;
  namedLogo: string;
  logoSvg: string;
  logoColor: string;
  logoSize: string;
  style: BadgeStyle;
}>;

export interface EndpointBadgeOptions {
  /** Override left-hand text (default: Bun API Coverage) */
  label?: string;
  /** Override computed color */
  color?: string;
  /** Label background color */
  labelColor?: string;
  /** Treat as error badge (locks color) */
  isError?: boolean;
  /** Simple-icons slug */
  namedLogo?: string;
  /** Inline SVG logo */
  logoSvg?: string;
  /** Logo color */
  logoColor?: string;
  /** Adaptive logo sizing ("auto") or pixel size */
  logoSize?: string;
  /** Badge style */
  style?: BadgeStyle;
}

/**
 * Generate badge data following the shields.io endpoint schema
 */
export function generateEndpointBadgeData(
  summary: CoverageSummary,
  options: EndpointBadgeOptions = {},
): EndpointBadgeData {
  const percent = Math.round(summary.percentComplete);
  const data: EndpointBadgeData = {
    schemaVersion: 1,
    label: options.label ?? "Bun API Coverage",
    message: `${percent}%`,
    color: options.color ?? getColor(percent),
  };

  if (options.labelColor) data.labelColor = options.labelColor;
  if (options.isError !== undefined) data.isError = options.isError;
  data.namedLogo = options.namedLogo ?? "bun";
  if (options.logoSvg) data.logoSvg = options.logoSvg;
  if (options.logoColor) data.logoColor = options.logoColor;
  if (options.logoSize) data.logoSize = options.logoSize;
  if (options.style) data.style = options.style;

  return data;
}

/**
 * Backwards-compatible alias for generating endpoint badge data
 */
export const generateBadgeData = generateEndpointBadgeData;

/**
 * Generate endpoint JSON for shields.io dynamic badge
 */
export function generateEndpointJson(
  report: CoverageReport,
  options: EndpointBadgeOptions = {},
): string {
  return JSON.stringify(
    generateEndpointBadgeData(report.summary, options),
    null,
    2,
  );
}

export default generateBadges;
