// Type comparison engine using TypeScript Compiler API
// Compares @types/bun interfaces against polyfill type definitions

import * as fs from "node:fs";
import * as path from "node:path";
import ts from "typescript";

import { INTERFACE_MAP, SPECIAL_APIS } from "./interface-map.ts";
import { resolveBunTypesPath } from "./extractor.ts";
import type {
  ComparisonResult,
  InterfaceComparison,
  MemberComparison,
  SignatureComparisonResult,
} from "./types.ts";

/**
 * Configuration for the comparator
 */
export interface ComparatorConfig {
  bunTypesPath?: string;
  polyfillTypesPath: string;
  strictSignatures?: boolean; // If true, wider polyfill signatures are "partial"
}

/**
 * Default comparator configuration
 */
export const DEFAULT_COMPARATOR_CONFIG: Partial<ComparatorConfig> = {
  strictSignatures: true, // wider => partial by default
};

/**
 * Compare Bun types against Polyfill types
 */
export async function compareTypes(
  config: ComparatorConfig,
): Promise<ComparisonResult> {
  const fullConfig = { ...DEFAULT_COMPARATOR_CONFIG, ...config };

  // Resolve @types/bun path
  const bunTypesPath = fullConfig.bunTypesPath ?? resolveBunTypesPath();

  // Create TypeScript program with both type sources
  const { program, checker, bunSourceFile, polyfillSourceFile } = createProgram(
    bunTypesPath,
    fullConfig.polyfillTypesPath,
  );

  const interfaces: InterfaceComparison[] = [];
  const warnings: string[] = [];

  // Compare each mapped interface
  for (const [bunName, polyfillName] of Object.entries(INTERFACE_MAP)) {
    // Skip special APIs
    if (SPECIAL_APIS[bunName]?.handling === "skip") {
      continue;
    }

    // Find Bun interface/type
    const bunResult = findTypeByName(checker, bunSourceFile, bunName);
    if (!bunResult.type && !bunResult.isModule) {
      warnings.push(`Could not find Bun type: ${bunName}`);
      continue;
    }

    // If no polyfill mapping, mark all as missing
    if (!polyfillName) {
      const members =
        bunResult.isModule ?
          extractModuleExportsAsMissing(
            checker,
            bunResult.moduleSymbol!,
            bunName,
          )
        : extractMembersAsMissing(checker, bunResult.type!, bunName);
      interfaces.push({
        bunInterface: bunName,
        polyfillInterface: null,
        members,
        stats: calculateStats(members),
      });
      continue;
    }

    // Find Polyfill interface/type
    const polyfillResult = findTypeByName(
      checker,
      polyfillSourceFile,
      polyfillName,
    );
    if (!polyfillResult.type && !polyfillResult.isModule) {
      warnings.push(`Could not find Polyfill type: ${polyfillName}`);
      const members =
        bunResult.isModule ?
          extractModuleExportsAsMissing(
            checker,
            bunResult.moduleSymbol!,
            bunName,
          )
        : extractMembersAsMissing(checker, bunResult.type!, bunName);
      interfaces.push({
        bunInterface: bunName,
        polyfillInterface: polyfillName,
        members,
        stats: calculateStats(members),
      });
      continue;
    }

    // Compare members - handle module vs interface comparison
    let members: MemberComparison[];
    if (bunResult.isModule) {
      // Compare module exports against interface properties
      members = compareModuleExportsToInterface(
        checker,
        bunResult.moduleSymbol!,
        polyfillResult.type!,
        bunName,
        fullConfig.strictSignatures ?? true,
      );
    } else {
      members = compareMembersBetweenTypes(
        checker,
        bunResult.type!,
        polyfillResult.type!,
        bunName,
        fullConfig.strictSignatures ?? true,
      );
    }

    interfaces.push({
      bunInterface: bunName,
      polyfillInterface: polyfillName,
      members,
      stats: calculateStats(members),
    });
  }

  // Calculate overall stats
  const allMembers = interfaces.flatMap((i) => i.members);
  const overallStats = calculateStats(allMembers);

  return {
    timestamp: new Date().toISOString(),
    bunTypesPath,
    polyfillTypesPath: fullConfig.polyfillTypesPath,
    interfaces,
    summary: overallStats,
    warnings,
  };
}

/**
 * Create TypeScript program with both type sources
 */
function createProgram(
  bunTypesPath: string,
  polyfillTypesPath: string,
): {
  program: ts.Program;
  checker: ts.TypeChecker;
  bunSourceFile: ts.SourceFile;
  polyfillSourceFile: ts.SourceFile;
} {
  // Find main d.ts files
  const bunDtsPath = path.join(bunTypesPath, "bun.d.ts");
  const shellDtsPath = path.join(bunTypesPath, "shell.d.ts");

  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    skipLibCheck: true,
    declaration: true,
    noEmit: true,
  };

  // Read source files
  const bunCode = fs.readFileSync(bunDtsPath, "utf-8");
  const shellCode =
    fs.existsSync(shellDtsPath) ? fs.readFileSync(shellDtsPath, "utf-8") : "";
  const polyfillCode = fs.readFileSync(polyfillTypesPath, "utf-8");

  // Create source files
  const bunSourceFile = ts.createSourceFile(
    "bun.d.ts",
    bunCode + "\n" + shellCode,
    ts.ScriptTarget.Latest,
    true,
  );

  const polyfillSourceFile = ts.createSourceFile(
    "polyfill-types.ts",
    polyfillCode,
    ts.ScriptTarget.Latest,
    true,
  );

  // Create a simple program host
  const host = ts.createCompilerHost(compilerOptions);
  const originalGetSourceFile = host.getSourceFile;
  host.getSourceFile = (fileName, languageVersion) => {
    if (fileName.includes("bun.d.ts")) return bunSourceFile;
    if (fileName.includes("polyfill-types.ts")) return polyfillSourceFile;
    return originalGetSourceFile(fileName, languageVersion);
  };

  const program = ts.createProgram(
    ["bun.d.ts", "polyfill-types.ts"],
    compilerOptions,
    host,
  );

  const checker = program.getTypeChecker();

  return { program, checker, bunSourceFile, polyfillSourceFile };
}

/**
 * Result from finding a type - can be either a regular type or module exports
 */
interface TypeLookupResult {
  type: ts.Type | null;
  isModule: boolean;
  moduleSymbol?: ts.Symbol;
}

/**
 * Find a type/interface by name in a source file
 * For module declarations (like "bun"), returns the module symbol for export extraction
 */
function findTypeByName(
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
  name: string,
): TypeLookupResult {
  let foundSymbol: ts.Symbol | undefined;
  let isModule = false;

  function visit(node: ts.Node): void {
    // Interface declaration
    if (ts.isInterfaceDeclaration(node) && node.name.text === name) {
      foundSymbol = checker.getSymbolAtLocation(node.name);
      return;
    }

    // Type alias
    if (ts.isTypeAliasDeclaration(node) && node.name.text === name) {
      foundSymbol = checker.getSymbolAtLocation(node.name);
      return;
    }

    // Module declaration: declare module "bun" { ... }
    if (ts.isModuleDeclaration(node)) {
      const moduleName = node.name.getText(sourceFile).replace(/['"]/g, "");

      // For "Bun", look inside declare module "bun"
      if (name === "Bun" && moduleName === "bun") {
        const moduleSymbol = checker.getSymbolAtLocation(node.name);
        if (moduleSymbol) {
          foundSymbol = moduleSymbol;
          isModule = true;
          return;
        }
      }

      // Recurse into module body for nested types
      if (node.body) {
        ts.forEachChild(node.body, visit);
      }
      return;
    }

    ts.forEachChild(node, visit);
  }

  ts.forEachChild(sourceFile, visit);

  if (foundSymbol) {
    if (isModule) {
      return { type: null, isModule: true, moduleSymbol: foundSymbol };
    }
    return {
      type: checker.getDeclaredTypeOfSymbol(foundSymbol),
      isModule: false,
    };
  }

  return { type: null, isModule: false };
}

/**
 * Extract all members from a type and mark them as missing
 */
function extractMembersAsMissing(
  checker: ts.TypeChecker,
  type: ts.Type,
  parentPath: string,
): MemberComparison[] {
  const members: MemberComparison[] = [];

  const properties = type.getProperties();
  for (const prop of properties) {
    const name = prop.getName();
    if (name.startsWith("_")) continue; // Skip private

    const propType = checker.getTypeOfSymbol(prop);
    const signature = checker.typeToString(propType);

    members.push({
      name,
      fullPath: `${parentPath}.${name}`,
      status: "missing",
      bunSignature: signature,
      polyfillSignature: null,
    });
  }

  return members;
}

/**
 * Extract all exports from a module symbol and mark them as missing
 * Used for `declare module "bun"` which exports functions/consts directly
 */
function extractModuleExportsAsMissing(
  checker: ts.TypeChecker,
  moduleSymbol: ts.Symbol,
  parentPath: string,
): MemberComparison[] {
  const members: MemberComparison[] = [];

  const exports = checker.getExportsOfModule(moduleSymbol);
  for (const exp of exports) {
    const name = exp.getName();
    if (name.startsWith("_")) continue; // Skip private/internal

    const expType = checker.getTypeOfSymbol(exp);
    const signature = checker.typeToString(expType);

    members.push({
      name,
      fullPath: `${parentPath}.${name}`,
      status: "missing",
      bunSignature: signature,
      polyfillSignature: null,
    });
  }

  return members;
}

/**
 * Compare module exports (from declare module "bun") against interface properties
 * This handles the case where Bun APIs are module exports but polyfills define them as interface
 */
function compareModuleExportsToInterface(
  checker: ts.TypeChecker,
  moduleSymbol: ts.Symbol,
  polyfillType: ts.Type,
  parentPath: string,
  strictSignatures: boolean,
): MemberComparison[] {
  const members: MemberComparison[] = [];

  // Get module exports
  const moduleExports = checker.getExportsOfModule(moduleSymbol);

  // Build polyfill properties map
  const polyfillPropsMap = new Map<string, ts.Symbol>();
  for (const prop of polyfillType.getProperties()) {
    polyfillPropsMap.set(prop.getName(), prop);
  }

  for (const exp of moduleExports) {
    const name = exp.getName();
    if (name.startsWith("_")) continue; // Skip private/internal

    const expType = checker.getTypeOfSymbol(exp);
    const bunSignature = checker.typeToString(expType);

    const polyfillProp = polyfillPropsMap.get(name);

    if (!polyfillProp) {
      members.push({
        name,
        fullPath: `${parentPath}.${name}`,
        status: "missing",
        bunSignature,
        polyfillSignature: null,
      });
      continue;
    }

    const polyfillPropType = checker.getTypeOfSymbol(polyfillProp);
    const polyfillSignature = checker.typeToString(polyfillPropType);

    // Compare signatures
    const comparison = compareSignatures(
      checker,
      expType,
      polyfillPropType,
      strictSignatures,
    );

    members.push({
      name,
      fullPath: `${parentPath}.${name}`,
      status: comparison.status,
      bunSignature,
      polyfillSignature,
      signatureDiff: comparison.diff,
    });
  }

  return members;
}

/**
 * Compare members between Bun and Polyfill types
 */
function compareMembersBetweenTypes(
  checker: ts.TypeChecker,
  bunType: ts.Type,
  polyfillType: ts.Type,
  parentPath: string,
  strictSignatures: boolean,
): MemberComparison[] {
  const members: MemberComparison[] = [];

  const bunProps = bunType.getProperties();
  const polyfillPropsMap = new Map<string, ts.Symbol>();

  for (const prop of polyfillType.getProperties()) {
    polyfillPropsMap.set(prop.getName(), prop);
  }

  for (const bunProp of bunProps) {
    const name = bunProp.getName();
    if (name.startsWith("_")) continue; // Skip private

    const bunPropType = checker.getTypeOfSymbol(bunProp);
    const bunSignature = checker.typeToString(bunPropType);

    const polyfillProp = polyfillPropsMap.get(name);

    if (!polyfillProp) {
      members.push({
        name,
        fullPath: `${parentPath}.${name}`,
        status: "missing",
        bunSignature,
        polyfillSignature: null,
      });
      continue;
    }

    const polyfillPropType = checker.getTypeOfSymbol(polyfillProp);
    const polyfillSignature = checker.typeToString(polyfillPropType);

    // Compare signatures
    const comparison = compareSignatures(
      checker,
      bunPropType,
      polyfillPropType,
      strictSignatures,
    );

    members.push({
      name,
      fullPath: `${parentPath}.${name}`,
      status: comparison.status,
      bunSignature,
      polyfillSignature,
      signatureDiff: comparison.diff,
    });
  }

  return members;
}

/**
 * Compare two type signatures
 */
function compareSignatures(
  checker: ts.TypeChecker,
  bunType: ts.Type,
  polyfillType: ts.Type,
  strict: boolean,
): SignatureComparisonResult {
  const bunStr = checker.typeToString(bunType);
  const polyfillStr = checker.typeToString(polyfillType);

  // Exact match
  if (bunStr === polyfillStr) {
    return { status: "implemented", match: true };
  }

  // Check if polyfill is assignable to bun (polyfill can be used where bun is expected)
  // This is a simplified check - full structural comparison would need more work
  const isCompatible = isSignatureCompatible(bunStr, polyfillStr);

  if (isCompatible) {
    // Polyfill signature is wider (accepts more) or equivalent
    if (strict) {
      return {
        status: "partial",
        match: false,
        diff: `Signature differs: Bun expects "${bunStr}", polyfill has "${polyfillStr}"`,
      };
    }
    return { status: "implemented", match: true };
  }

  return {
    status: "partial",
    match: false,
    diff: `Signature mismatch: Bun="${bunStr}" vs Polyfill="${polyfillStr}"`,
  };
}

/**
 * Simple signature compatibility check
 * More sophisticated than string equality, less complex than full type checking
 */
function isSignatureCompatible(bunSig: string, polyfillSig: string): boolean {
  // Normalize signatures for comparison
  const normBun = normalizeSignature(bunSig);
  const normPoly = normalizeSignature(polyfillSig);

  if (normBun === normPoly) return true;

  // Check if polyfill signature is a superset (accepts more types)
  // This is a heuristic - proper checking would need full type analysis

  // If polyfill has union with more types, it's compatible
  if (
    normPoly.includes(normBun) ||
    normBun.split(" | ").every((part) => normPoly.includes(part))
  ) {
    return true;
  }

  return false;
}

/**
 * Normalize a type signature for comparison
 */
function normalizeSignature(sig: string): string {
  return sig
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/;\s*}/g, " }") // Normalize object endings
    .replace(/,\s*/g, ", ") // Normalize commas
    .trim();
}

/**
 * Calculate statistics for a set of member comparisons
 */
function calculateStats(members: MemberComparison[]): {
  total: number;
  implemented: number;
  partial: number;
  missing: number;
  percentComplete: number;
} {
  const total = members.length;
  const implemented = members.filter((m) => m.status === "implemented").length;
  const partial = members.filter((m) => m.status === "partial").length;
  const missing = members.filter((m) => m.status === "missing").length;

  // Implemented = 100%, Partial = 50%, Missing = 0%
  const percentComplete =
    total > 0 ? Math.round(((implemented + partial * 0.5) / total) * 100) : 0;

  return { total, implemented, partial, missing, percentComplete };
}

/**
 * Get a summary of what's implemented vs missing
 */
export function getComparisonSummary(result: ComparisonResult): string {
  const lines: string[] = [];

  lines.push("=== Type Comparison Summary ===");
  lines.push("");
  lines.push(`Total APIs: ${result.summary.total}`);
  lines.push(`Implemented: ${result.summary.implemented}`);
  lines.push(`Partial: ${result.summary.partial}`);
  lines.push(`Missing: ${result.summary.missing}`);
  lines.push(`Coverage: ${result.summary.percentComplete}%`);
  lines.push("");

  for (const iface of result.interfaces) {
    const impl = iface.polyfillInterface ?? "(not implemented)";
    lines.push(
      `${iface.bunInterface} -> ${impl}: ${iface.stats.percentComplete}%`,
    );
    lines.push(
      `  Implemented: ${iface.stats.implemented}/${iface.stats.total}`,
    );

    const missing = iface.members.filter((m) => m.status === "missing");
    if (missing.length > 0 && missing.length <= 10) {
      lines.push(`  Missing: ${missing.map((m) => m.name).join(", ")}`);
    } else if (missing.length > 10) {
      lines.push(`  Missing: ${missing.length} members`);
    }
  }

  return lines.join("\n");
}
