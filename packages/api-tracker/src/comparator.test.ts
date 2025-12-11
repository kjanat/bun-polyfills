import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";

import {
  compareTypes,
  DEFAULT_COMPARATOR_CONFIG,
  getComparisonSummary,
} from "./comparator.ts";

function writeTempTypes(): { bunDir: string; polyfillPath: string } {
  const bunDir = mkdtempSync(path.join(tmpdir(), "bun-types-"));
  const polyfillPath = path.join(bunDir, "polyfill-types.ts");

  // Minimal Bun module with exports that map to PolyfillBun interface members
  const bunModule = `
    declare module "bun" {
      export const version: string;
      export function file(path: string): string;
      export interface BunFile { name: string }
      export interface FileSink { close(): void }
      export interface Subprocess { exitCode: number }
      export interface SyncSubprocess { exitCode: number }
      export interface SpawnOptions { cwd?: string }
      export interface ShellPromise { text(): Promise<string> }
      export interface ShellOutput { stdout: string }
      export interface Server { listen(): void }
      export interface ServerWebSocket { send(data: string): void }
      export interface Database { query(sql: string): unknown }
      export interface Statement { run(): number }
      export interface Transpiler { transform(code: string): string }
      export interface CryptoHasher { digest(): Uint8Array }
      export interface S3Client { putObject(): Promise<void> }
      export interface S3File { key: string }
      export interface HTMLRewriter { on(selector: string): void }
    }
  `;

  const shellTypes = `
    export interface ShellPromise { text(): Promise<string> }
    export interface ShellOutput { stdout: string }
  `;

  const polyfillTypes = `
    export interface PolyfillBun {
      version: string;
      file(path: string): string;
    }
    export interface PolyfillBunFile { name: string }
    export interface PolyfillFileSink { close(): void }
    export interface Subprocess { exitCode: number }
    export interface SyncSubprocess { exitCode: number }
    export interface SpawnOptionsObject { cwd?: string }
    export interface ShellPromise { text(): Promise<string> }
    export interface ShellOutput { stdout: string }
  `;

  fs.writeFileSync(path.join(bunDir, "bun.d.ts"), bunModule);
  fs.writeFileSync(path.join(bunDir, "shell.d.ts"), shellTypes);
  fs.writeFileSync(polyfillPath, polyfillTypes);

  return { bunDir, polyfillPath };
}

describe("comparator", () => {
  test("compareTypes produces implemented stats from minimal d.ts", async () => {
    const { bunDir, polyfillPath } = writeTempTypes();

    const result = await compareTypes({
      ...DEFAULT_COMPARATOR_CONFIG,
      bunTypesPath: bunDir,
      polyfillTypesPath: polyfillPath,
      strictSignatures: false,
    });

    // Clean up temp files
    rmSync(bunDir, { recursive: true, force: true });

    // We should see at least the Bun exports counted as implemented
    const bunInterface = result.interfaces.find(
      (i) => i.bunInterface === "Bun",
    );
    expect(bunInterface?.stats.implemented).toBeGreaterThan(0);
    expect(result.summary.total).toBeGreaterThan(0);
    // No hard warnings when types exist
    expect(result.warnings.length).toBe(0);
  });

  test("strictSignatures flags wider polyfill signature as partial", async () => {
    const bunDir = mkdtempSync(path.join(tmpdir(), "bun-types-"));
    const polyfillPath = path.join(bunDir, "polyfill-types.ts");

    fs.writeFileSync(
      path.join(bunDir, "bun.d.ts"),
      `declare module "bun" { export const version: string; }`,
    );
    fs.writeFileSync(
      polyfillPath,
      `export const version: string | number; export interface PolyfillBun { version: string | number }`,
    );

    const result = await compareTypes({
      polyfillTypesPath: polyfillPath,
      bunTypesPath: bunDir,
      strictSignatures: true,
    });

    rmSync(bunDir, { recursive: true, force: true });

    const member = result.interfaces
      .find((i) => i.bunInterface === "Bun")
      ?.members.find((m) => m.name === "version");
    expect(member?.status).toBe("partial");
    expect(member?.signatureDiff).toContain("Signature differs");
  });

  test("non-strict signatures treat compatible widening as implemented", async () => {
    const bunDir = mkdtempSync(path.join(tmpdir(), "bun-types-"));
    const polyfillPath = path.join(bunDir, "polyfill-types.ts");

    fs.writeFileSync(
      path.join(bunDir, "bun.d.ts"),
      `declare module "bun" { export const version: string; }`,
    );
    fs.writeFileSync(
      polyfillPath,
      `export const version: string | number; export interface PolyfillBun { version: string | number }`,
    );

    const result = await compareTypes({
      polyfillTypesPath: polyfillPath,
      bunTypesPath: bunDir,
      strictSignatures: false,
    });

    rmSync(bunDir, { recursive: true, force: true });

    const member = result.interfaces
      .find((i) => i.bunInterface === "Bun")
      ?.members.find((m) => m.name === "version");
    expect(member?.status).toBe("implemented");
    expect(member?.signatureDiff).toBeUndefined();
  });

  test("getComparisonSummary renders totals and missing members", () => {
    const missingMembers = Array.from({ length: 12 }).map((_, i) => ({
      name: `prop${i}`,
      fullPath: `Bun.prop${i}`,
      status: "missing" as const,
      bunSignature: "string",
      polyfillSignature: null,
    }));

    const summaryText = getComparisonSummary({
      timestamp: "2025-01-01T00:00:00.000Z",
      bunTypesPath: "/tmp/bun",
      polyfillTypesPath: "/tmp/polyfill",
      interfaces: [
        {
          bunInterface: "Bun",
          polyfillInterface: "PolyfillBun",
          members: missingMembers,
          stats: {
            total: 12,
            implemented: 0,
            partial: 0,
            missing: 12,
            percentComplete: 0,
          },
        },
      ],
      summary: {
        total: 12,
        implemented: 0,
        partial: 0,
        missing: 12,
        percentComplete: 0,
      },
      warnings: [],
    });

    expect(summaryText).toContain("Total APIs: 12");
    expect(summaryText).toContain("Coverage: 0%");
    // When more than 10 missing members we show a count, not list
    expect(summaryText).toContain("Missing: 12 members");
  });

  test("getComparisonSummary lists missing member names when small", () => {
    const missingMembers = Array.from({ length: 2 }).map((_, i) => ({
      name: `prop${i}`,
      fullPath: `Bun.prop${i}`,
      status: "missing" as const,
      bunSignature: "string",
      polyfillSignature: null,
    }));

    const summaryText = getComparisonSummary({
      timestamp: "2025-01-01T00:00:00.000Z",
      bunTypesPath: "/tmp/bun",
      polyfillTypesPath: "/tmp/polyfill",
      interfaces: [
        {
          bunInterface: "Bun",
          polyfillInterface: "PolyfillBun",
          members: missingMembers,
          stats: {
            total: 2,
            implemented: 0,
            partial: 0,
            missing: 2,
            percentComplete: 0,
          },
        },
      ],
      summary: {
        total: 2,
        implemented: 0,
        partial: 0,
        missing: 2,
        percentComplete: 0,
      },
      warnings: [],
    });

    expect(summaryText).toContain("Missing: prop0, prop1");
  });
});
