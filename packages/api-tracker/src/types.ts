// Type definitions for Bun API tracking

/**
 * Implementation status of an API
 */
export type ApiStatus =
  | "implemented" // Fully working
  | "partial" // Some methods/features missing
  | "stub" // Exists but throws/no-op
  | "not-started"; // No implementation

/**
 * Kind of API declaration
 */
export type ApiKind =
  | "function" // Bun.file(), Bun.spawn()
  | "const" // Bun.version, Bun.env
  | "class" // Bun.Transpiler, Bun.CryptoHasher
  | "namespace" // Bun.hash, Bun.password, Bun.$
  | "interface" // Supporting interfaces
  | "type"; // Type aliases

/**
 * Category of API functionality
 */
export type ApiCategory =
  | "filesystem" // file, write, mmap, stdin/stdout/stderr
  | "process" // spawn, spawnSync, $, which, argv, env
  | "crypto" // hash, password, SHA*, MD*, CryptoHasher
  | "compression" // gzip, deflate, zstd
  | "network" // serve, connect, listen, fetch, dns
  | "bundler" // build, plugin, Transpiler
  | "database" // bun:sqlite, Bun.sql, Bun.redis
  | "storage" // Bun.s3
  | "ffi" // bun:ffi
  | "utility" // sleep, gc, inspect, deepEquals, etc.
  | "module" // resolve, resolveSync, pathToFileURL
  | "parsing" // TOML, YAML
  | "security" // CSRF, secrets
  | "html" // HTMLRewriter
  | "wasm" // WebAssembly utilities
  | "globals" // Global extensions (Worker, WebSocket)
  | "internal" // Internal APIs (not for polyfilling)
  | "unknown"; // Uncategorized

/**
 * Bun module sources
 */
export type BunModule =
  | "bun" // Main Bun namespace
  | "bun:sqlite" // SQLite driver
  | "bun:ffi" // FFI bindings
  | "bun:jsc" // JSC internals (low priority)
  | "global"; // Global extensions

/**
 * A single Bun API entry
 */
export interface BunApi {
  /** Short name: "file", "hash", "wyhash" */
  name: string;

  /** Full path: "Bun.file", "Bun.hash.wyhash", "Bun.$.braces" */
  fullPath: string;

  /** Module this API belongs to */
  module: BunModule;

  /** Type of declaration */
  kind: ApiKind;

  /** Functional category */
  category: ApiCategory;

  /** Source .d.ts file */
  sourceFile: string;

  /** Line number in source file */
  lineNumber?: number;

  /** Function/method signature if applicable */
  signature?: string;

  /** JSDoc description if available */
  description?: string;

  /** For classes/namespaces - child APIs */
  children?: BunApi[];

  /** Whether this is a runtime API (vs compile-time only) */
  isRuntime: boolean;

  /** Whether this API is deprecated */
  isDeprecated?: boolean;

  /** Parent API path (for nested APIs) */
  parent?: string;
}

/**
 * Implementation status for a specific API
 */
export interface ApiImplementation {
  /** The API being tracked */
  api: BunApi;

  /** Current implementation status */
  status: ApiStatus;

  /** Percentage complete (0-100) */
  completeness: number;

  /** File where this is implemented */
  implementedIn?: string;

  /** Human-readable notes */
  notes?: string;

  /** List of missing features/methods */
  missingFeatures?: string[];

  /** List of implemented features/methods */
  implementedFeatures?: string[];
}

/**
 * Summary statistics
 */
export interface CoverageSummary {
  /** Total number of APIs tracked */
  total: number;

  /** Number fully implemented */
  implemented: number;

  /** Number partially implemented */
  partial: number;

  /** Number with stub implementations */
  stub: number;

  /** Number not started */
  notStarted: number;

  /** Overall percentage complete */
  percentComplete: number;
}

/**
 * Category-level statistics
 */
export interface CategoryStats {
  /** Total APIs in category */
  total: number;

  /** Implemented count */
  implemented: number;

  /** Partial count */
  partial: number;

  /** Stub count */
  stub: number;

  /** Not started count */
  notStarted: number;

  /** Percentage complete */
  percentComplete: number;
}

/**
 * Full coverage report
 */
export interface CoverageReport {
  /** ISO timestamp of generation */
  generated: string;

  /** Version of @types/bun used */
  bunTypesVersion: string;

  /** Overall summary */
  summary: CoverageSummary;

  /** Stats by category */
  byCategory: Record<ApiCategory, CategoryStats>;

  /** Stats by module */
  byModule: Record<BunModule, CategoryStats>;

  /** All API implementations */
  apis: ApiImplementation[];
}

/**
 * Manual override entry for APIs that need human annotation
 */
export interface ManualOverride {
  /** Full path of the API */
  fullPath: string;

  /** Override status */
  status?: ApiStatus;

  /** Override completeness */
  completeness?: number;

  /** Human notes */
  notes?: string;

  /** Missing features */
  missingFeatures?: string[];

  /** Implemented features */
  implementedFeatures?: string[];

  /** Override category */
  category?: ApiCategory;

  /** Whether to skip this API in tracking */
  skip?: boolean;
}

/**
 * Configuration for the extractor
 */
export interface ExtractorConfig {
  /** Path to @types/bun package (resolves to bun-types internally) */
  bunTypesPath: string;

  /** Which modules to extract */
  modules: BunModule[];

  /** Whether to include internal APIs */
  includeInternal: boolean;

  /** Whether to include deprecated APIs */
  includeDeprecated: boolean;

  /** Maximum depth for nested APIs (classes, namespaces) */
  maxDepth: number;
}

/**
 * Configuration for the detector
 */
export interface DetectorConfig {
  /** Path to polyfills source directory */
  polyfillsPath: string;

  /** Path to manual overrides file */
  overridesPath?: string;

  /** Pattern to match polyfill files */
  filePattern: string;
}

/**
 * Configuration for the reporter
 */
export interface ReporterConfig {
  /** Output directory */
  outputDir: string;

  /** Generate JSON report */
  json: boolean;

  /** Generate Markdown report */
  markdown: boolean;

  /** Minimum coverage threshold for CI checks */
  minCoverage?: number;
}

/**
 * Full tracker configuration
 */
export interface TrackerConfig {
  extractor: ExtractorConfig;
  detector: DetectorConfig;
  reporter: ReporterConfig;
}

/**
 * Result from extracting APIs
 */
export interface ExtractionResult {
  /** Extracted APIs */
  apis: BunApi[];

  /** @types/bun version */
  version: string;

  /** Extraction timestamp */
  timestamp: string;

  /** Any warnings during extraction */
  warnings: string[];
}

/**
 * Result from detecting implementations
 */
export interface DetectionResult {
  /** Detected implementations */
  implementations: Map<string, ApiImplementation>;

  /** Files scanned */
  filesScanned: string[];

  /** Any warnings during detection */
  warnings: string[];
}

// ============================================================================
// Type Comparison Types (for new automated comparator)
// ============================================================================

/**
 * Comparison status for a single member
 */
export type ComparisonStatus = "implemented" | "partial" | "missing";

/**
 * Comparison result for a single interface/type member
 */
export interface MemberComparison {
  /** Member name (e.g., "file", "text", "spawn") */
  name: string;

  /** Full path (e.g., "Bun.file", "BunFile.text") */
  fullPath: string;

  /** Comparison status */
  status: ComparisonStatus;

  /** Bun's type signature */
  bunSignature: string | null;

  /** Polyfill's type signature */
  polyfillSignature: string | null;

  /** Human-readable signature diff if not matching */
  signatureDiff?: string;
}

/**
 * Statistics for an interface comparison
 */
export interface ComparisonStats {
  total: number;
  implemented: number;
  partial: number;
  missing: number;
  percentComplete: number;
}

/**
 * Comparison result for a single interface
 */
export interface InterfaceComparison {
  /** Bun interface name (e.g., "BunFile", "Subprocess") */
  bunInterface: string;

  /** Polyfill interface name, null if not implemented */
  polyfillInterface: string | null;

  /** Member-by-member comparison */
  members: MemberComparison[];

  /** Statistics for this interface */
  stats: ComparisonStats;
}

/**
 * Result of signature comparison
 */
export interface SignatureComparisonResult {
  status: ComparisonStatus;
  match: boolean;
  diff?: string;
}

/**
 * Full result from type comparison
 */
export interface ComparisonResult {
  /** ISO timestamp */
  timestamp: string;

  /** Path to @types/bun */
  bunTypesPath: string;

  /** Path to polyfill types */
  polyfillTypesPath: string;

  /** Per-interface comparison results */
  interfaces: InterfaceComparison[];

  /** Overall summary stats */
  summary: ComparisonStats;

  /** Any warnings during comparison */
  warnings: string[];
}

// ============================================================================
// Test Compatibility Types
// ============================================================================

/**
 * Result from a single test
 */
export interface TestResult {
  /** Test file path */
  file: string;

  /** Test suite name (describe block) */
  suite: string;

  /** Test name (it/test block) */
  test: string;

  /** Test status */
  status: "pass" | "fail" | "skip" | "todo";

  /** Duration in milliseconds */
  duration: number;

  /** Error message if failed */
  error?: string;
}

/**
 * Aggregated test coverage for an API
 */
export interface TestCoverage {
  /** API path (e.g., "Bun.file") */
  api: string;

  /** Total tests for this API */
  testsTotal: number;

  /** Passed tests */
  testsPassed: number;

  /** Failed tests */
  testsFailed: number;

  /** Skipped tests */
  testsSkipped: number;

  /** Percentage of tests passing */
  percentPassing: number;
}

/**
 * Full test run results
 */
export interface TestRunResult {
  /** ISO timestamp */
  timestamp: string;

  /** All individual test results */
  results: TestResult[];

  /** Aggregated by API */
  byApi: TestCoverage[];

  /** Overall stats */
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
}

// ============================================================================
// Annotation Types (replaces ManualOverride)
// ============================================================================

/**
 * Human annotation for an API
 * Can only provide notes or cap completeness downward, never inflate
 */
export interface ApiAnnotation {
  /** Full path of the API */
  fullPath: string;

  /** Human-readable notes */
  notes?: string;

  /** Maximum completeness cap (can only reduce auto-detected value) */
  maxCompleteness?: number;

  /** Known limitations */
  limitations?: string[];

  /** Whether this requires native Bun (can't be polyfilled) */
  requiresNativeBun?: boolean;

  /** Reason for requiring native Bun */
  nativeBunReason?: string;
}

/**
 * Combined coverage from all sources
 */
export interface CombinedApiCoverage {
  /** API path */
  fullPath: string;

  /** From type comparison */
  typeStatus: ComparisonStatus;

  /** Type signatures match */
  signatureMatch: boolean;

  /** From test results */
  testResults?: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    percentPassing: number;
  };

  /** From annotations */
  annotation?: ApiAnnotation;

  /** Final computed completeness */
  completeness: number;

  /** Final status */
  status: ApiStatus;
}
