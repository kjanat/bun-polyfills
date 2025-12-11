// Detect Bun API implementations using type comparison
// This replaces the old heuristic-based detection with TS Compiler API comparison

import * as fs from "node:fs";
import * as path from "node:path";

import { compareTypes, type ComparatorConfig } from "./comparator.ts";
import type {
  ApiAnnotation,
  ApiImplementation,
  ApiStatus,
  BunApi,
  ComparisonResult,
  ComparisonStatus,
  DetectionResult,
  DetectorConfig,
  MemberComparison,
} from "./types.ts";

/** Default detector configuration */
export const DEFAULT_DETECTOR_CONFIG: DetectorConfig = {
  polyfillsPath: "", // Must be provided
  filePattern: "**/*.ts",
};

/**
 * Load annotations from JSON file
 * Annotations can only provide notes or cap completeness downward
 */
export function loadAnnotations(
  annotationsPath: string,
): Map<string, ApiAnnotation> {
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
 * Map file paths to which APIs they implement (derived from types.ts structure)
 * This is informational only - actual detection comes from type comparison
 */
const FILE_TO_API_HINTS: Record<string, string[]> = {
  "file.ts": ["Bun.file", "Bun.write", "Bun.stdin", "Bun.stdout", "Bun.stderr"],
  "shell.ts": ["Bun.$"],
  "spawn.ts": ["Bun.spawn", "Bun.spawnSync"],
  "env.ts": ["Bun.env", "Bun.version", "Bun.revision"],
  "modules.ts": [
    "Bun.resolve",
    "Bun.resolveSync",
    "Bun.pathToFileURL",
    "Bun.fileURLToPath",
  ],
  "process.ts": [
    "Bun.which",
    "Bun.sleep",
    "Bun.sleepSync",
    "Bun.nanoseconds",
    "Bun.isMainThread",
    "Bun.gc",
  ],
  "compression.ts": [
    "Bun.gzipSync",
    "Bun.gunzipSync",
    "Bun.deflateSync",
    "Bun.inflateSync",
  ],
  "glob.ts": ["Bun.Glob"],
  "toml.ts": ["Bun.TOML"],
};

/**
 * Convert ComparisonStatus to ApiStatus
 */
function comparisonStatusToApiStatus(status: ComparisonStatus): ApiStatus {
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
 * Calculate completeness from comparison status and optional annotation cap
 */
function calculateCompleteness(
  status: ComparisonStatus,
  signatureMatch: boolean,
  annotation?: ApiAnnotation,
): number {
  // Base completeness from status
  let completeness: number;
  switch (status) {
    case "implemented":
      completeness = signatureMatch ? 100 : 90; // 90% if signature differs
      break;
    case "partial":
      completeness = 50;
      break;
    case "missing":
      completeness = 0;
      break;
  }

  // Apply annotation cap (can only reduce, never increase)
  if (annotation?.maxCompleteness !== undefined) {
    completeness = Math.min(completeness, annotation.maxCompleteness);
  }

  return completeness;
}

/**
 * Find which file implements an API based on hints
 */
function findImplementingFile(apiPath: string): string | undefined {
  for (const [file, apis] of Object.entries(FILE_TO_API_HINTS)) {
    if (apis.some((a) => apiPath === a || apiPath.startsWith(`${a}.`))) {
      return file;
    }
  }
  return undefined;
}

/**
 * Convert type comparison result to legacy API implementation format
 * This maintains backwards compatibility with existing reporter
 */
function comparisonToImplementation(
  member: MemberComparison,
  api: BunApi,
  annotations: Map<string, ApiAnnotation>,
): ApiImplementation {
  const annotation = annotations.get(member.fullPath);
  const signatureMatch =
    member.status === "implemented" && !member.signatureDiff;

  return {
    api,
    status: comparisonStatusToApiStatus(member.status),
    completeness: calculateCompleteness(
      member.status,
      signatureMatch,
      annotation,
    ),
    implementedIn: findImplementingFile(member.fullPath),
    notes: annotation?.notes ?? member.signatureDiff,
    missingFeatures: annotation?.limitations,
  };
}

/**
 * Detect implementations using type comparison
 * This is the new automated detection method
 */
export async function detectImplementations(
  apis: BunApi[],
  config: Partial<DetectorConfig> = {},
): Promise<DetectionResult> {
  const fullConfig: DetectorConfig = { ...DEFAULT_DETECTOR_CONFIG, ...config };

  if (!fullConfig.polyfillsPath) {
    throw new Error("polyfillsPath is required");
  }

  const implementations = new Map<string, ApiImplementation>();
  const filesScanned: string[] = [];
  const warnings: string[] = [];

  // Load annotations (formerly manual overrides)
  const annotationsPath =
    fullConfig.overridesPath ??
    path.join(
      path.dirname(fullConfig.polyfillsPath),
      "..",
      "api-tracker",
      "data",
      "annotations.json",
    );
  const annotations = loadAnnotations(annotationsPath);

  // Get polyfill types path
  const polyfillTypesPath = path.join(fullConfig.polyfillsPath, "types.ts");
  if (!fs.existsSync(polyfillTypesPath)) {
    warnings.push(`Polyfill types not found: ${polyfillTypesPath}`);
    // Return all APIs as not implemented
    for (const api of apis) {
      implementations.set(api.fullPath, {
        api,
        status: "not-started",
        completeness: 0,
      });
    }
    return { implementations, filesScanned, warnings };
  }

  filesScanned.push(polyfillTypesPath);

  // Run type comparison
  const comparatorConfig: ComparatorConfig = {
    polyfillTypesPath,
    strictSignatures: true, // wider signatures => partial
  };

  let comparison: ComparisonResult;
  try {
    comparison = await compareTypes(comparatorConfig);
  } catch (err) {
    warnings.push(`Type comparison failed: ${err}`);
    // Return all APIs as not implemented
    for (const api of apis) {
      implementations.set(api.fullPath, {
        api,
        status: "not-started",
        completeness: 0,
      });
    }
    return { implementations, filesScanned, warnings };
  }

  // Add comparison warnings
  warnings.push(...comparison.warnings);

  // Build a lookup of comparison results by fullPath
  const comparisonByPath = new Map<string, MemberComparison>();
  for (const iface of comparison.interfaces) {
    for (const member of iface.members) {
      comparisonByPath.set(member.fullPath, member);
    }
  }

  // Create implementation entries for all requested APIs
  for (const api of apis) {
    const member = comparisonByPath.get(api.fullPath);

    if (member) {
      implementations.set(
        api.fullPath,
        comparisonToImplementation(member, api, annotations),
      );
    } else {
      // API not in comparison result - check if it's a child of a compared API
      // or if it's genuinely missing
      const annotation = annotations.get(api.fullPath);
      implementations.set(api.fullPath, {
        api,
        status: annotation?.requiresNativeBun ? "not-started" : "not-started",
        completeness: 0,
        notes: annotation?.notes ?? annotation?.nativeBunReason,
      });
    }
  }

  return { implementations, filesScanned, warnings };
}

/**
 * Get comparison result directly (for new reporting)
 */
export async function getTypeComparison(
  polyfillTypesPath: string,
): Promise<ComparisonResult> {
  return compareTypes({ polyfillTypesPath, strictSignatures: true });
}

/**
 * Get summary of implementation statuses
 */
export function getImplementationSummary(
  implementations: Map<string, ApiImplementation>,
): {
  total: number;
  implemented: number;
  partial: number;
  stub: number;
  notStarted: number;
} {
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

  return {
    total: implementations.size,
    implemented,
    partial,
    stub,
    notStarted,
  };
}

/**
 * Filter implementations by status
 */
export function filterByStatus(
  implementations: Map<string, ApiImplementation>,
  status: ApiStatus,
): ApiImplementation[] {
  return Array.from(implementations.values()).filter(
    (impl) => impl.status === status,
  );
}

/**
 * Get implementations sorted by completeness
 */
export function sortByCompleteness(
  implementations: Map<string, ApiImplementation>,
  ascending: boolean = false,
): ApiImplementation[] {
  return Array.from(implementations.values()).sort((a, b) =>
    ascending ?
      a.completeness - b.completeness
    : b.completeness - a.completeness,
  );
}

// Legacy exports for backwards compatibility
export { loadAnnotations as loadManualOverrides };
