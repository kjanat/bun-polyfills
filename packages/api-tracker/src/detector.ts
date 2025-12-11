// Detect Bun API implementations in polyfill source files

import * as fs from "node:fs";
import * as path from "node:path";
import ts from "typescript";

import type {
  ApiImplementation,
  ApiStatus,
  BunApi,
  DetectionResult,
  DetectorConfig,
  ManualOverride,
} from "./types.ts";

/** Default detector configuration */
export const DEFAULT_DETECTOR_CONFIG: DetectorConfig = {
  polyfillsPath: "", // Must be provided
  filePattern: "**/*.ts",
};

/**
 * Load manual overrides from JSON file
 */
export function loadManualOverrides(
  overridesPath: string,
): Map<string, ManualOverride> {
  const overrides = new Map<string, ManualOverride>();

  if (!fs.existsSync(overridesPath)) {
    return overrides;
  }

  try {
    const data = JSON.parse(fs.readFileSync(overridesPath, "utf-8"));
    if (Array.isArray(data)) {
      for (const override of data as ManualOverride[]) {
        if (override.fullPath) {
          overrides.set(override.fullPath, override);
        }
      }
    }
  } catch {
    // Ignore parse errors
  }

  return overrides;
}

/**
 * Known API mappings from polyfill files to Bun APIs
 */
const POLYFILL_MAPPINGS: Record<string, string[]> = {
  "file.ts": [
    "Bun.file",
    "Bun.write",
    "Bun.stdin",
    "Bun.stdout",
    "Bun.stderr",
    "BunFile",
    "FileSink",
  ],
  "shell.ts": ["Bun.$", "ShellPromise", "ShellOutput"],
  "spawn.ts": ["Bun.spawn", "Bun.spawnSync", "Subprocess", "SyncSubprocess"],
  "env.ts": ["Bun.env", "Bun.version", "Bun.revision"],
  "modules.ts": [
    "Bun.resolve",
    "Bun.resolveSync",
    "Bun.pathToFileURL",
    "Bun.fileURLToPath",
  ],
};

/**
 * Scan a TypeScript file for Bun API implementations
 */
function scanFile(
  filePath: string,
  code: string,
): { apis: Set<string>; exports: string[] } {
  const apis = new Set<string>();
  const exports: string[] = [];

  const sourceFile = ts.createSourceFile(
    filePath,
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  function visit(node: ts.Node): void {
    // Look for: bun.propertyName = ...
    if (
      ts.isExpressionStatement(node) &&
      ts.isBinaryExpression(node.expression) &&
      node.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ) {
      const left = node.expression.left;
      if (
        ts.isPropertyAccessExpression(left) &&
        ts.isIdentifier(left.expression)
      ) {
        const objName = left.expression.text;
        const propName = left.name.text;

        if (objName === "bun" || objName === "Bun") {
          apis.add(`Bun.${propName}`);
        }
      }
    }

    // Look for: if (!("propertyName" in bun)) { bun.propertyName = ... }
    if (ts.isIfStatement(node)) {
      const condition = node.expression;
      // Check for: !("prop" in bun)
      if (
        ts.isPrefixUnaryExpression(condition) &&
        condition.operator === ts.SyntaxKind.ExclamationToken &&
        ts.isParenthesizedExpression(condition.operand)
      ) {
        const inner = condition.operand.expression;
        if (
          ts.isBinaryExpression(inner) &&
          inner.operatorToken.kind === ts.SyntaxKind.InKeyword
        ) {
          const left = inner.left;
          if (ts.isStringLiteral(left)) {
            apis.add(`Bun.${left.text}`);
          }
        }
      }
    }

    // Look for export declarations
    if (ts.isExportDeclaration(node) || ts.isExportAssignment(node)) {
      // Handle: export { foo, bar }
      if (ts.isExportDeclaration(node) && node.exportClause) {
        if (ts.isNamedExports(node.exportClause)) {
          for (const element of node.exportClause.elements) {
            exports.push(element.name.text);
          }
        }
      }
    }

    // Look for exported functions/classes
    if (
      (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      if (node.name) {
        exports.push(node.name.text);

        // Map init functions to APIs
        const name = node.name.text;
        if (name.startsWith("init")) {
          const apiName = name.slice(4); // Remove "init" prefix
          // Map to known APIs
          const mappedApis = Object.entries(POLYFILL_MAPPINGS).find(
            ([, apis]) =>
              apis.some(
                (a) =>
                  a.toLowerCase().includes(apiName.toLowerCase()) ||
                  apiName.toLowerCase().includes(a.split(".").pop() ?? ""),
              ),
          );
          if (mappedApis) {
            for (const api of mappedApis[1]) {
              apis.add(api);
            }
          }
        }
      }
    }

    // Look for exported variables
    if (
      ts.isVariableStatement(node) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          exports.push(decl.name.text);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { apis, exports };
}

/**
 * Determine implementation status for an API
 */
function determineStatus(
  api: BunApi,
  implementedApis: Set<string>,
  overrides: Map<string, ManualOverride>,
): { status: ApiStatus; completeness: number; notes?: string } {
  // Check manual override first
  const override = overrides.get(api.fullPath);
  if (override) {
    if (override.skip) {
      return { status: "not-started", completeness: 0, notes: "Skipped" };
    }
    return {
      status: override.status ?? "not-started",
      completeness: override.completeness ?? 0,
      notes: override.notes,
    };
  }

  // Check if this API or its parent is implemented
  if (implementedApis.has(api.fullPath)) {
    // Check if it has children and count implemented
    if (api.children && api.children.length > 0) {
      const implementedChildren = api.children.filter(
        (child) =>
          implementedApis.has(child.fullPath) ||
          overrides.get(child.fullPath)?.status === "implemented",
      ).length;

      const completeness = Math.round(
        (implementedChildren / api.children.length) * 100,
      );

      if (completeness === 100) {
        return { status: "implemented", completeness: 100 };
      } else if (completeness > 0) {
        return {
          status: "partial",
          completeness,
          notes: `${implementedChildren}/${api.children.length} methods implemented`,
        };
      }
    }

    return { status: "implemented", completeness: 100 };
  }

  // Check parent path
  const parentPath = api.parent;
  if (parentPath && implementedApis.has(parentPath)) {
    // Parent is implemented, so this might be partially done
    return {
      status: "partial",
      completeness: 50,
      notes: "Parent API implemented",
    };
  }

  return { status: "not-started", completeness: 0 };
}

/**
 * Detect implementations for a list of APIs
 */
export async function detectImplementations(
  apis: BunApi[],
  config: Partial<DetectorConfig> = {},
): Promise<DetectionResult> {
  const fullConfig: DetectorConfig = {
    ...DEFAULT_DETECTOR_CONFIG,
    ...config,
  };

  if (!fullConfig.polyfillsPath) {
    throw new Error("polyfillsPath is required");
  }

  const implementations = new Map<string, ApiImplementation>();
  const filesScanned: string[] = [];
  const warnings: string[] = [];
  const implementedApis = new Set<string>();

  // Load manual overrides
  const overrides = fullConfig.overridesPath
    ? loadManualOverrides(fullConfig.overridesPath)
    : new Map<string, ManualOverride>();

  // Scan polyfill source files
  const srcDir = fullConfig.polyfillsPath;
  if (!fs.existsSync(srcDir)) {
    warnings.push(`Polyfills directory not found: ${srcDir}`);
    return { implementations, filesScanned, warnings };
  }

  // Get list of .ts files
  const files = fs.readdirSync(srcDir).filter((f) => f.endsWith(".ts"));

  for (const file of files) {
    const filePath = path.join(srcDir, file);
    filesScanned.push(filePath);

    try {
      const code = fs.readFileSync(filePath, "utf-8");
      const { apis: fileApis } = scanFile(filePath, code);

      // Add detected APIs
      for (const api of fileApis) {
        implementedApis.add(api);
      }

      // Also add APIs from known mappings
      const mappedApis = POLYFILL_MAPPINGS[file];
      if (mappedApis) {
        for (const api of mappedApis) {
          implementedApis.add(api);
        }
      }
    } catch (err) {
      warnings.push(`Failed to scan ${filePath}: ${err}`);
    }
  }

  // Create implementation entries for all APIs
  for (const api of apis) {
    const { status, completeness, notes } = determineStatus(
      api,
      implementedApis,
      overrides,
    );

    // Find which file implements this API
    let implementedIn: string | undefined;
    for (const [file, mappedApis] of Object.entries(POLYFILL_MAPPINGS)) {
      if (
        mappedApis.some(
          (a) => api.fullPath === a || api.fullPath.startsWith(a + "."),
        )
      ) {
        implementedIn = file;
        break;
      }
    }

    const override = overrides.get(api.fullPath);

    implementations.set(api.fullPath, {
      api,
      status,
      completeness,
      implementedIn,
      notes,
      missingFeatures: override?.missingFeatures,
      implementedFeatures: override?.implementedFeatures,
    });
  }

  return { implementations, filesScanned, warnings };
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
    ascending
      ? a.completeness - b.completeness
      : b.completeness - a.completeness,
  );
}
