// Mapping between Bun interfaces and Polyfill interfaces
// Used by comparator to know which types to compare

/**
 * Maps Bun interface/type names to their Polyfill equivalents.
 * null means "not implemented yet"
 */
export const INTERFACE_MAP: Record<string, string | null> = {
  // Main Bun namespace (top-level APIs)
  // The "Bun" module exports are compared against PolyfillBun interface
  Bun: "PolyfillBun",

  // File APIs
  BunFile: "PolyfillBunFile",
  FileSink: "PolyfillFileSink",

  // Spawn APIs
  Subprocess: "Subprocess",
  SyncSubprocess: "SyncSubprocess",
  SpawnOptions: "SpawnOptionsObject",

  // Shell APIs
  ShellPromise: "ShellPromise",
  ShellOutput: "ShellOutput",

  // Not implemented yet
  Server: null,
  ServerWebSocket: null,
  Database: null, // bun:sqlite
  Statement: null,
  Transpiler: null,
  CryptoHasher: null,
  S3Client: null,
  S3File: null,
  HTMLRewriter: null,
};

/**
 * Which d.ts files to look for each interface
 */
export const INTERFACE_SOURCES: Record<string, string[]> = {
  Bun: ["bun.d.ts"],
  BunFile: ["bun.d.ts"],
  FileSink: ["bun.d.ts"],
  Subprocess: ["bun.d.ts"],
  SyncSubprocess: ["bun.d.ts"],
  SpawnOptions: ["bun.d.ts"],
  ShellPromise: ["shell.d.ts"],
  ShellOutput: ["shell.d.ts"],
  Server: ["serve.d.ts"],
  ServerWebSocket: ["serve.d.ts"],
  Database: ["sqlite.d.ts"],
  Statement: ["sqlite.d.ts"],
  Transpiler: ["bun.d.ts"],
  CryptoHasher: ["bun.d.ts"],
  S3Client: ["s3.d.ts"],
  S3File: ["s3.d.ts"],
  HTMLRewriter: ["html-rewriter.d.ts"],
};

/**
 * Special handling for namespaced APIs
 * e.g., Bun.$ has nested properties like $.braces, $.escape
 */
export const NAMESPACE_APIS: Record<string, string[]> = {
  $: ["braces", "escape", "env", "cwd", "nothrow", "throws"],
  dns: ["lookup", "resolve", "prefetch"],
  password: ["hash", "hashSync", "verify", "verifySync"],
  hash: [
    "wyhash",
    "adler32",
    "crc32",
    "cityHash32",
    "cityHash64",
    "cityHash128",
    "murmur32v2",
    "murmur32v3",
    "murmur64v2",
  ],
  semver: ["satisfies", "order"],
};

/**
 * APIs that require special handling during comparison
 */
export const SPECIAL_APIS: Record<
  string,
  { reason: string; handling: "skip" | "manual" | "transform" }
> = {
  // Bun.unsafe is internal
  unsafe: { reason: "Internal API", handling: "skip" },
  // __internal is internal
  __internal: { reason: "Internal API", handling: "skip" },
  // bun:jsc is low priority
  "bun:jsc": { reason: "JSC internals, low priority", handling: "skip" },
};
