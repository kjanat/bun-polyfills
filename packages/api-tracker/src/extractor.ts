// Extract Bun APIs from @types/bun declaration files using TypeScript Compiler API
// Note: @types/bun re-exports bun-types, so we resolve through @types/bun -> bun-types

import * as fs from "node:fs";
import * as path from "node:path";
import ts from "typescript";

import type {
  ApiCategory,
  ApiKind,
  BunApi,
  BunModule,
  ExtractionResult,
  ExtractorConfig,
} from "./types.ts";

/** Default extractor configuration */
export const DEFAULT_EXTRACTOR_CONFIG: ExtractorConfig = {
  bunTypesPath: "", // Will be resolved at runtime
  modules: ["bun", "bun:sqlite", "bun:ffi", "global"],
  includeInternal: false,
  includeDeprecated: false,
  maxDepth: 3,
};

/** Files to parse for each module */
const MODULE_FILES: Record<BunModule, string[]> = {
  bun: [
    "bun.d.ts",
    "shell.d.ts",
    "redis.d.ts",
    "sql.d.ts",
    "s3.d.ts",
    "html-rewriter.d.ts",
    "wasm.d.ts",
    "security.d.ts",
  ],
  "bun:sqlite": ["sqlite.d.ts"],
  "bun:ffi": ["ffi.d.ts"],
  "bun:jsc": ["jsc.d.ts"],
  global: ["globals.d.ts"],
};

/** Category mappings for known APIs */
const API_CATEGORIES: Record<string, ApiCategory> = {
  // Filesystem
  file: "filesystem",
  write: "filesystem",
  stdin: "filesystem",
  stdout: "filesystem",
  stderr: "filesystem",
  mmap: "filesystem",
  embeddedFiles: "filesystem",

  // Process
  spawn: "process",
  spawnSync: "process",
  $: "process",
  which: "process",
  argv: "process",
  env: "process",
  main: "process",

  // Crypto
  hash: "crypto",
  password: "crypto",
  sha: "crypto",
  SHA1: "crypto",
  SHA256: "crypto",
  SHA384: "crypto",
  SHA512: "crypto",
  SHA512_256: "crypto",
  SHA224: "crypto",
  MD4: "crypto",
  MD5: "crypto",
  CryptoHasher: "crypto",

  // Compression
  deflateSync: "compression",
  inflateSync: "compression",
  gzipSync: "compression",
  gunzipSync: "compression",
  zstdCompressSync: "compression",
  zstdDecompressSync: "compression",
  zstdCompress: "compression",
  zstdDecompress: "compression",

  // Network
  serve: "network",
  connect: "network",
  listen: "network",
  fetch: "network",
  dns: "network",
  udpSocket: "network",

  // Bundler
  build: "bundler",
  plugin: "bundler",
  Transpiler: "bundler",

  // Database
  sql: "database",
  SQL: "database",
  RedisClient: "database",
  Database: "database",

  // Storage
  s3: "storage",
  S3Client: "storage",
  S3File: "storage",

  // FFI
  dlopen: "ffi",
  CString: "ffi",
  ptr: "ffi",
  toBuffer: "ffi",
  toArrayBuffer: "ffi",
  cc: "ffi",

  // Utility
  sleep: "utility",
  sleepSync: "utility",
  gc: "utility",
  nanoseconds: "utility",
  inspect: "utility",
  deepEquals: "utility",
  deepMatch: "utility",
  escapeHTML: "utility",
  stringWidth: "utility",
  stripANSI: "utility",
  color: "utility",
  semver: "utility",
  openInEditor: "utility",
  peek: "utility",
  version: "utility",
  revision: "utility",
  allocUnsafe: "utility",
  concatArrayBuffers: "utility",
  ArrayBufferSink: "utility",
  readableStreamToArrayBuffer: "utility",
  readableStreamToFormData: "utility",
  readableStreamToArray: "utility",
  generateHeapSnapshot: "utility",
  Glob: "utility",
  isMainThread: "utility",
  enableANSIColors: "utility",
  Cookie: "utility",
  CookieMap: "utility",

  // Module
  resolve: "module",
  resolveSync: "module",
  pathToFileURL: "module",
  fileURLToPath: "module",

  // Parsing
  TOML: "parsing",
  YAML: "parsing",

  // Security
  CSRF: "security",
  secrets: "security",

  // HTML
  HTMLRewriter: "html",

  // WASM
  WASM: "wasm",

  // Internal
  __internal: "internal",
  unsafe: "internal",
};

/**
 * Resolve @types/bun path from node_modules
 * @types/bun re-exports bun-types, so we follow the dependency chain
 */
export function resolveBunTypesPath(startDir: string = process.cwd()): string {
  // Walk up directories looking for @types/bun
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    // First try @types/bun (preferred)
    const typesBunPath = path.join(dir, "node_modules", "@types", "bun");
    if (fs.existsSync(typesBunPath)) {
      // @types/bun re-exports bun-types, find the actual bun-types
      const bunTypesPath = resolveBunTypesFromTypesBun(typesBunPath, dir);
      if (bunTypesPath) return bunTypesPath;
    }

    // Fallback to direct bun-types (legacy)
    const directPath = path.join(dir, "node_modules", "bun-types");
    if (fs.existsSync(directPath)) {
      return directPath;
    }

    dir = path.dirname(dir);
  }

  throw new Error(
    "Could not find @types/bun. Install it with: bun add -d @types/bun",
  );
}

/**
 * Resolve bun-types from @types/bun dependency
 */
function resolveBunTypesFromTypesBun(
  typesBunPath: string,
  rootDir: string,
): string | null {
  // Check @types/bun's package.json for bun-types dependency
  const pkgPath = path.join(typesBunPath, "package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    const bunTypesVersion = pkg.dependencies?.["bun-types"];

    if (bunTypesVersion) {
      // Look for bun-types in node_modules
      const candidates = [
        // Hoisted to root
        path.join(rootDir, "node_modules", "bun-types"),
        // Nested in @types/bun
        path.join(typesBunPath, "node_modules", "bun-types"),
        // In .bun cache (Bun workspace format)
        path.join(
          rootDir,
          "node_modules",
          ".bun",
          `bun-types@${bunTypesVersion.replace(/[\^~]/, "")}`,
          "node_modules",
          "bun-types",
        ),
      ];

      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
    }
  }

  // Fallback: just use @types/bun path if it contains the .d.ts files directly
  if (fs.existsSync(path.join(typesBunPath, "bun.d.ts"))) {
    return typesBunPath;
  }

  return null;
}

/**
 * Get @types/bun version from package.json
 */
export function getBunTypesVersion(bunTypesPath: string): string {
  const pkgPath = path.join(bunTypesPath, "package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    return pkg.version ?? "unknown";
  }
  return "unknown";
}

/**
 * Infer API category from name
 */
function inferCategory(name: string, parent?: string): ApiCategory {
  // Check direct mapping
  if (API_CATEGORIES[name]) {
    return API_CATEGORIES[name];
  }

  // Check parent category
  if (parent) {
    const parentName = parent.split(".").pop();
    if (parentName && API_CATEGORIES[parentName]) {
      return API_CATEGORIES[parentName];
    }
  }

  return "unknown";
}

/**
 * Convert TypeScript SyntaxKind to ApiKind
 */
export function getApiKind(node: ts.Node): ApiKind {
  if (ts.isFunctionDeclaration(node)) return "function";
  if (ts.isMethodDeclaration(node)) return "function";
  if (ts.isMethodSignature(node)) return "function";
  if (ts.isClassDeclaration(node)) return "class";
  if (ts.isInterfaceDeclaration(node)) return "interface";
  if (ts.isTypeAliasDeclaration(node)) return "type";
  if (ts.isModuleDeclaration(node)) return "namespace";
  if (ts.isVariableDeclaration(node)) return "const";
  if (ts.isPropertySignature(node)) return "const";
  if (ts.isPropertyDeclaration(node)) return "const";
  return "const";
}

/**
 * Get JSDoc description from a node
 */
function getJsDocDescription(node: ts.Node): string | undefined {
  const jsDoc = (node as ts.Node & { jsDoc?: ts.JSDoc[] }).jsDoc;
  if (jsDoc && jsDoc.length > 0) {
    const comment = jsDoc[0]?.comment;
    if (typeof comment === "string") {
      return comment;
    }
  }
  return undefined;
}

/**
 * Check if node is deprecated
 */
function isDeprecated(node: ts.Node): boolean {
  const jsDoc = (node as ts.Node & { jsDoc?: ts.JSDoc[] }).jsDoc;
  if (jsDoc) {
    for (const doc of jsDoc) {
      if (doc.tags) {
        for (const tag of doc.tags) {
          if (tag.tagName.text === "deprecated") {
            return true;
          }
        }
      }
    }
  }
  return false;
}

/**
 * Extract APIs from a single declaration file
 */
function extractFromFile(
  filePath: string,
  sourceFile: ts.SourceFile,
  module: BunModule,
  config: ExtractorConfig,
): BunApi[] {
  const apis: BunApi[] = [];
  const fileName = path.basename(filePath);

  function visit(
    node: ts.Node,
    parentPath: string = "",
    depth: number = 0,
  ): void {
    if (depth > config.maxDepth) return;

    // Handle module declarations: declare module "bun" { ... }
    if (ts.isModuleDeclaration(node)) {
      const moduleName = node.name.getText(sourceFile);

      // Check if this is a module we care about
      if (
        moduleName === '"bun"' ||
        moduleName === "'bun'" ||
        moduleName === '"bun:sqlite"' ||
        moduleName === '"bun:ffi"'
      ) {
        // Determine effective module for nested processing
        const _effectiveModule: BunModule =
          moduleName === '"bun:sqlite"' ? "bun:sqlite"
          : moduleName === '"bun:ffi"' ? "bun:ffi"
          : "bun";
        void _effectiveModule; // Reserved for future use

        if (node.body && ts.isModuleBlock(node.body)) {
          for (const statement of node.body.statements) {
            visit(statement, "Bun", depth + 1);
          }
        }
        return;
      }

      // Handle namespace declarations within module
      const nsName = moduleName.replace(/['"]/g, "");
      if (nsName.startsWith("__")) return; // Skip internal

      const fullPath = parentPath ? `${parentPath}.${nsName}` : nsName;
      const api: BunApi = {
        name: nsName,
        fullPath,
        module,
        kind: "namespace",
        category: inferCategory(nsName, parentPath),
        sourceFile: fileName,
        lineNumber: sourceFile.getLineAndCharacterOfPosition(node.getStart())
          .line,
        description: getJsDocDescription(node),
        isRuntime: true,
        isDeprecated: isDeprecated(node),
        parent: parentPath || undefined,
        children: [],
      };

      if (!config.includeDeprecated && api.isDeprecated) return;
      if (!config.includeInternal && api.category === "internal") return;

      // Process namespace body
      if (node.body && ts.isModuleBlock(node.body)) {
        for (const statement of node.body.statements) {
          const childApis = extractChildApis(
            statement,
            fullPath,
            depth + 1,
            config,
            sourceFile,
            fileName,
            module,
          );
          api.children?.push(...childApis);
        }
      }

      apis.push(api);
      return;
    }

    // Handle function declarations
    if (ts.isFunctionDeclaration(node) && node.name) {
      const name = node.name.text;
      const fullPath = parentPath ? `${parentPath}.${name}` : name;

      const api: BunApi = {
        name,
        fullPath,
        module,
        kind: "function",
        category: inferCategory(name, parentPath),
        sourceFile: fileName,
        lineNumber: sourceFile.getLineAndCharacterOfPosition(node.getStart())
          .line,
        signature: node.getText(sourceFile).split("{")[0]?.trim(),
        description: getJsDocDescription(node),
        isRuntime: true,
        isDeprecated: isDeprecated(node),
        parent: parentPath || undefined,
      };

      if (!config.includeDeprecated && api.isDeprecated) return;
      if (!config.includeInternal && api.category === "internal") return;

      apis.push(api);
      return;
    }

    // Handle variable declarations (const, var, let)
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          const name = decl.name.text;
          const fullPath = parentPath ? `${parentPath}.${name}` : name;

          // Check if it's an object with methods (like Bun.hash)
          const children: BunApi[] = [];
          if (decl.type && ts.isTypeLiteralNode(decl.type)) {
            for (const member of decl.type.members) {
              const childApis = extractChildApis(
                member,
                fullPath,
                depth + 1,
                config,
                sourceFile,
                fileName,
                module,
              );
              children.push(...childApis);
            }
          }

          const api: BunApi = {
            name,
            fullPath,
            module,
            kind: children.length > 0 ? "namespace" : "const",
            category: inferCategory(name, parentPath),
            sourceFile: fileName,
            lineNumber: sourceFile.getLineAndCharacterOfPosition(
              node.getStart(),
            ).line,
            description: getJsDocDescription(node),
            isRuntime: true,
            isDeprecated: isDeprecated(node),
            parent: parentPath || undefined,
            children: children.length > 0 ? children : undefined,
          };

          if (!config.includeDeprecated && api.isDeprecated) continue;
          if (!config.includeInternal && api.category === "internal") continue;

          apis.push(api);
        }
      }
      return;
    }

    // Handle class declarations
    if (ts.isClassDeclaration(node) && node.name) {
      const name = node.name.text;
      const fullPath = parentPath ? `${parentPath}.${name}` : name;

      const api: BunApi = {
        name,
        fullPath,
        module,
        kind: "class",
        category: inferCategory(name, parentPath),
        sourceFile: fileName,
        lineNumber: sourceFile.getLineAndCharacterOfPosition(node.getStart())
          .line,
        description: getJsDocDescription(node),
        isRuntime: true,
        isDeprecated: isDeprecated(node),
        parent: parentPath || undefined,
        children: [],
      };

      if (!config.includeDeprecated && api.isDeprecated) return;
      if (!config.includeInternal && api.category === "internal") return;

      // Extract class members
      for (const member of node.members) {
        const childApis = extractChildApis(
          member,
          fullPath,
          depth + 1,
          config,
          sourceFile,
          fileName,
          module,
        );
        api.children?.push(...childApis);
      }

      apis.push(api);
      return;
    }

    // Handle interface declarations (for tracking)
    if (ts.isInterfaceDeclaration(node)) {
      const name = node.name.text;

      // Only track interfaces that are part of the public API
      const publicInterfaces = [
        "BunFile",
        "Server",
        "ServerWebSocket",
        "Subprocess",
        "SyncSubprocess",
        "FileSink",
      ];

      if (publicInterfaces.includes(name)) {
        const fullPath = parentPath ? `${parentPath}.${name}` : name;

        const api: BunApi = {
          name,
          fullPath,
          module,
          kind: "interface",
          category: inferCategory(name, parentPath),
          sourceFile: fileName,
          lineNumber: sourceFile.getLineAndCharacterOfPosition(node.getStart())
            .line,
          description: getJsDocDescription(node),
          isRuntime: true,
          isDeprecated: isDeprecated(node),
          parent: parentPath || undefined,
          children: [],
        };

        // Extract interface members
        for (const member of node.members) {
          const childApis = extractChildApis(
            member,
            fullPath,
            depth + 1,
            config,
            sourceFile,
            fileName,
            module,
          );
          api.children?.push(...childApis);
        }

        apis.push(api);
      }
      return;
    }

    // Recurse into children for other node types
    ts.forEachChild(node, (child) => visit(child, parentPath, depth));
  }

  visit(sourceFile);
  return apis;
}

/**
 * Extract child APIs from class/interface/namespace members
 */
function extractChildApis(
  node: ts.Node,
  parentPath: string,
  depth: number,
  config: ExtractorConfig,
  sourceFile: ts.SourceFile,
  fileName: string,
  module: BunModule,
): BunApi[] {
  const apis: BunApi[] = [];

  if (depth > config.maxDepth) return apis;

  // Method declarations
  if (ts.isMethodDeclaration(node) || ts.isMethodSignature(node)) {
    const name = node.name?.getText(sourceFile);
    if (name && !name.startsWith("_")) {
      const fullPath = `${parentPath}.${name}`;
      apis.push({
        name,
        fullPath,
        module,
        kind: "function",
        category: inferCategory(name, parentPath),
        sourceFile: fileName,
        lineNumber: sourceFile.getLineAndCharacterOfPosition(node.getStart())
          .line,
        signature: node.getText(sourceFile).split("{")[0]?.trim(),
        description: getJsDocDescription(node),
        isRuntime: true,
        isDeprecated: isDeprecated(node),
        parent: parentPath,
      });
    }
  }

  // Property declarations
  if (ts.isPropertyDeclaration(node) || ts.isPropertySignature(node)) {
    const name = node.name?.getText(sourceFile);
    if (name && !name.startsWith("_")) {
      const fullPath = `${parentPath}.${name}`;
      apis.push({
        name,
        fullPath,
        module,
        kind: "const",
        category: inferCategory(name, parentPath),
        sourceFile: fileName,
        lineNumber: sourceFile.getLineAndCharacterOfPosition(node.getStart())
          .line,
        description: getJsDocDescription(node),
        isRuntime: true,
        isDeprecated: isDeprecated(node),
        parent: parentPath,
      });
    }
  }

  // Function in namespace
  if (ts.isFunctionDeclaration(node) && node.name) {
    const name = node.name.text;
    const fullPath = `${parentPath}.${name}`;
    apis.push({
      name,
      fullPath,
      module,
      kind: "function",
      category: inferCategory(name, parentPath),
      sourceFile: fileName,
      lineNumber: sourceFile.getLineAndCharacterOfPosition(node.getStart())
        .line,
      signature: node.getText(sourceFile).split("{")[0]?.trim(),
      description: getJsDocDescription(node),
      isRuntime: true,
      isDeprecated: isDeprecated(node),
      parent: parentPath,
    });
  }

  return apis;
}

/**
 * Main extraction function
 */
export async function extractApis(
  config: Partial<ExtractorConfig> = {},
): Promise<ExtractionResult> {
  const fullConfig: ExtractorConfig = {
    ...DEFAULT_EXTRACTOR_CONFIG,
    ...config,
  };

  // Resolve @types/bun path if not provided
  if (!fullConfig.bunTypesPath) {
    fullConfig.bunTypesPath = resolveBunTypesPath();
  }

  const version = getBunTypesVersion(fullConfig.bunTypesPath);
  const apis: BunApi[] = [];
  const warnings: string[] = [];

  // Process each module
  for (const module of fullConfig.modules) {
    const files = MODULE_FILES[module] ?? [];

    for (const file of files) {
      const filePath = path.join(fullConfig.bunTypesPath, file);

      if (!fs.existsSync(filePath)) {
        warnings.push(`File not found: ${filePath}`);
        continue;
      }

      const code = fs.readFileSync(filePath, "utf-8");
      const sourceFile = ts.createSourceFile(
        file,
        code,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      );

      const fileApis = extractFromFile(
        filePath,
        sourceFile,
        module,
        fullConfig,
      );
      apis.push(...fileApis);
    }
  }

  // Deduplicate APIs by fullPath
  const seenPaths = new Set<string>();
  const dedupedApis = apis.filter((api) => {
    if (seenPaths.has(api.fullPath)) {
      return false;
    }
    seenPaths.add(api.fullPath);
    return true;
  });

  return {
    apis: dedupedApis,
    version,
    timestamp: new Date().toISOString(),
    warnings,
  };
}

/**
 * Flatten nested APIs for easier iteration
 */
export function flattenApis(apis: BunApi[]): BunApi[] {
  const result: BunApi[] = [];

  function flatten(api: BunApi): void {
    result.push(api);
    if (api.children) {
      for (const child of api.children) {
        flatten(child);
      }
    }
  }

  for (const api of apis) {
    flatten(api);
  }

  return result;
}

/**
 * Get top-level APIs only (no children)
 */
export function getTopLevelApis(apis: BunApi[]): BunApi[] {
  return apis.filter((api) => !api.parent);
}

/**
 * Filter APIs by category
 */
export function filterByCategory(
  apis: BunApi[],
  category: ApiCategory,
): BunApi[] {
  return apis.filter((api) => api.category === category);
}

/**
 * Filter APIs by module
 */
export function filterByModule(apis: BunApi[], module: BunModule): BunApi[] {
  return apis.filter((api) => api.module === module);
}
