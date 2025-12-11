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

  /** Version of bun-types used */
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
  /** Path to bun-types package */
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

  /** bun-types version */
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
