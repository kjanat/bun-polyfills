import { describe, expect, test } from "bun:test";

import {
  calculateByCategory,
  calculateByModule,
  calculateSummary,
  checkCoverage,
  DEFAULT_REPORTER_CONFIG,
  generateConsoleSummary,
  generateJsonReport,
  generateMarkdownReport,
  generateReport,
} from "./reporter";
import type { ApiImplementation, CoverageReport } from "./types";

describe("reporter", () => {
  // Helper to create mock implementations
  const createMockImpl = (
    name: string,
    status: ApiImplementation["status"],
    category: ApiImplementation["api"]["category"] = "utility",
    module: ApiImplementation["api"]["module"] = "bun",
  ): ApiImplementation => ({
    api: {
      name,
      fullPath: `Bun.${name}`,
      module,
      kind: "function",
      category,
      sourceFile: "test.d.ts",
      isRuntime: true,
    },
    status,
    completeness:
      status === "implemented" ? 100
      : status === "partial" ? 50
      : 0,
  });

  describe("DEFAULT_REPORTER_CONFIG", () => {
    test("has expected default values", () => {
      expect(DEFAULT_REPORTER_CONFIG.outputDir).toBe("./output");
      expect(DEFAULT_REPORTER_CONFIG.json).toBe(true);
      expect(DEFAULT_REPORTER_CONFIG.markdown).toBe(true);
      expect(DEFAULT_REPORTER_CONFIG.minCoverage).toBeUndefined();
    });
  });

  describe("calculateSummary", () => {
    test("calculates correct counts", () => {
      const implementations = new Map<string, ApiImplementation>();
      implementations.set("impl1", createMockImpl("impl1", "implemented"));
      implementations.set("impl2", createMockImpl("impl2", "implemented"));
      implementations.set("partial1", createMockImpl("partial1", "partial"));
      implementations.set("stub1", createMockImpl("stub1", "stub"));
      implementations.set("not1", createMockImpl("not1", "not-started"));

      const summary = calculateSummary(implementations);

      expect(summary.total).toBe(5);
      expect(summary.implemented).toBe(2);
      expect(summary.partial).toBe(1);
      expect(summary.stub).toBe(1);
      expect(summary.notStarted).toBe(1);
    });

    test("calculates percentComplete correctly", () => {
      const implementations = new Map<string, ApiImplementation>();
      // 2 implemented + 0.5 * 2 partial = 3 out of 4 = 75%
      implementations.set("impl1", createMockImpl("impl1", "implemented"));
      implementations.set("impl2", createMockImpl("impl2", "implemented"));
      implementations.set("partial1", createMockImpl("partial1", "partial"));
      implementations.set("partial2", createMockImpl("partial2", "partial"));

      const summary = calculateSummary(implementations);
      expect(summary.percentComplete).toBe(75);
    });

    test("handles empty map", () => {
      const summary = calculateSummary(new Map());
      expect(summary.total).toBe(0);
      expect(summary.percentComplete).toBe(0);
    });
  });

  describe("calculateByCategory", () => {
    test("groups implementations by category", () => {
      const implementations = new Map<string, ApiImplementation>();
      implementations.set(
        "file",
        createMockImpl("file", "implemented", "filesystem"),
      );
      implementations.set(
        "write",
        createMockImpl("write", "implemented", "filesystem"),
      );
      implementations.set(
        "spawn",
        createMockImpl("spawn", "partial", "process"),
      );
      implementations.set(
        "hash",
        createMockImpl("hash", "not-started", "crypto"),
      );

      const byCategory = calculateByCategory(implementations);

      expect(byCategory.filesystem?.total).toBe(2);
      expect(byCategory.filesystem?.implemented).toBe(2);
      expect(byCategory.process?.total).toBe(1);
      expect(byCategory.process?.partial).toBe(1);
      expect(byCategory.crypto?.total).toBe(1);
      expect(byCategory.crypto?.notStarted).toBe(1);
    });

    test("calculates percentComplete per category", () => {
      const implementations = new Map<string, ApiImplementation>();
      implementations.set(
        "file",
        createMockImpl("file", "implemented", "filesystem"),
      );
      implementations.set(
        "write",
        createMockImpl("write", "partial", "filesystem"),
      );

      const byCategory = calculateByCategory(implementations);
      // 1 implemented + 0.5 * 1 partial = 1.5 out of 2 = 75%
      expect(byCategory.filesystem?.percentComplete).toBe(75);
    });

    test("handles empty implementations map", () => {
      const byCategory = calculateByCategory(new Map());
      expect(Object.keys(byCategory)).toHaveLength(0);
    });
  });

  describe("calculateByModule", () => {
    test("groups implementations by module", () => {
      const implementations = new Map<string, ApiImplementation>();
      implementations.set(
        "file",
        createMockImpl("file", "implemented", "filesystem", "bun"),
      );
      implementations.set(
        "Database",
        createMockImpl("Database", "partial", "database", "bun:sqlite"),
      );
      implementations.set(
        "dlopen",
        createMockImpl("dlopen", "not-started", "ffi", "bun:ffi"),
      );

      const byModule = calculateByModule(implementations);

      expect(byModule.bun?.total).toBe(1);
      expect(byModule.bun?.implemented).toBe(1);
      expect(byModule["bun:sqlite"]?.total).toBe(1);
      expect(byModule["bun:sqlite"]?.partial).toBe(1);
      expect(byModule["bun:ffi"]?.total).toBe(1);
      expect(byModule["bun:ffi"]?.notStarted).toBe(1);
    });

    test("handles empty implementations map", () => {
      const byModule = calculateByModule(new Map());
      expect(Object.keys(byModule)).toHaveLength(0);
    });
  });

  describe("generateReport", () => {
    test("creates complete report structure", () => {
      const implementations = new Map<string, ApiImplementation>();
      implementations.set("test", createMockImpl("test", "implemented"));

      const report = generateReport(implementations, "1.0.0");

      expect(report.bunTypesVersion).toBe("1.0.0");
      expect(report.generated).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.byCategory).toBeDefined();
      expect(report.byModule).toBeDefined();
      expect(report.apis).toHaveLength(1);
    });
  });

  describe("generateJsonReport", () => {
    test("produces valid JSON string", () => {
      const implementations = new Map<string, ApiImplementation>();
      implementations.set("test", createMockImpl("test", "implemented"));
      const report = generateReport(implementations, "1.0.0");

      const json = generateJsonReport(report);
      const parsed = JSON.parse(json);

      expect(parsed.bunTypesVersion).toBe("1.0.0");
      expect(parsed.summary.total).toBe(1);
    });
  });

  describe("generateMarkdownReport", () => {
    test("produces markdown with expected sections", () => {
      const implementations = new Map<string, ApiImplementation>();
      implementations.set(
        "file",
        createMockImpl("file", "implemented", "filesystem"),
      );
      implementations.set(
        "spawn",
        createMockImpl("spawn", "partial", "process"),
      );
      const report = generateReport(implementations, "1.0.0");

      const md = generateMarkdownReport(report);

      expect(md).toContain("# Bun API Coverage Report");
      expect(md).toContain("## Summary");
      expect(md).toContain("## Progress by Category");
      expect(md).toContain("## Progress by Module");
      expect(md).toContain("## Legend");
      expect(md).toContain("`Bun.file`");
      expect(md).toContain("`Bun.spawn`");
    });

    test("includes status emojis", () => {
      const implementations = new Map<string, ApiImplementation>();
      implementations.set("test", createMockImpl("test", "implemented"));
      const report = generateReport(implementations, "1.0.0");

      const md = generateMarkdownReport(report);

      expect(md).toContain(":white_check_mark:");
    });

    test("handles zero-total report without NaN", () => {
      const emptyReport: CoverageReport = {
        logo: "bun",
        generated: new Date().toISOString(),
        bunTypesVersion: "0.0.0",
        summary: {
          total: 0,
          implemented: 0,
          partial: 0,
          stub: 0,
          notStarted: 0,
          percentComplete: 0,
        },
        byCategory: {} as CoverageReport["byCategory"],
        byModule: {} as CoverageReport["byModule"],
        apis: [],
      };

      const md = generateMarkdownReport(emptyReport);

      // Should not contain NaN (the bug this test prevents)
      expect(md).not.toContain("NaN");
      // Should show 0% for all statuses
      expect(md).toContain("| 0 | 0% |");
    });
  });

  describe("checkCoverage", () => {
    test("passes when coverage meets threshold", () => {
      const report: CoverageReport = {
        logo: "bun",
        generated: new Date().toISOString(),
        bunTypesVersion: "1.0.0",
        summary: {
          total: 10,
          implemented: 8,
          partial: 0,
          stub: 0,
          notStarted: 2,
          percentComplete: 80,
        },
        byCategory: {} as CoverageReport["byCategory"],
        byModule: {} as CoverageReport["byModule"],
        apis: [],
      };

      const result = checkCoverage(report, 80);
      expect(result.passed).toBe(true);
      expect(result.actual).toBe(80);
      expect(result.required).toBe(80);
    });

    test("fails when coverage below threshold", () => {
      const report: CoverageReport = {
        logo: "bun",
        generated: new Date().toISOString(),
        bunTypesVersion: "1.0.0",
        summary: {
          total: 10,
          implemented: 3,
          partial: 0,
          stub: 0,
          notStarted: 7,
          percentComplete: 30,
        },
        byCategory: {} as CoverageReport["byCategory"],
        byModule: {} as CoverageReport["byModule"],
        apis: [],
      };

      const result = checkCoverage(report, 50);
      expect(result.passed).toBe(false);
      expect(result.actual).toBe(30);
      expect(result.required).toBe(50);
    });
  });

  describe("generateConsoleSummary", () => {
    test("produces readable console output", () => {
      const report: CoverageReport = {
        logo: "bun",
        generated: new Date().toISOString(),
        bunTypesVersion: "1.0.0",
        summary: {
          total: 100,
          implemented: 50,
          partial: 20,
          stub: 0,
          notStarted: 30,
          percentComplete: 60,
        },
        byCategory: {} as CoverageReport["byCategory"],
        byModule: {} as CoverageReport["byModule"],
        apis: [],
      };

      const output = generateConsoleSummary(report);

      expect(output).toContain("Bun API Coverage Report");
      expect(output).toContain("Total APIs:     100");
      expect(output).toContain("Implemented:    50");
      expect(output).toContain("Partial:        20");
      expect(output).toContain("Not Started:    30");
      expect(output).toContain("Progress:       60%");
    });
  });
});
