import { describe, expect, test } from "bun:test";

import {
  DEFAULT_DETECTOR_CONFIG,
  filterByStatus,
  getImplementationSummary,
  loadAnnotations,
  sortByCompleteness,
} from "./detector";
import type { ApiAnnotation, ApiImplementation } from "./types";

describe("detector", () => {
  describe("DEFAULT_DETECTOR_CONFIG", () => {
    test("has expected default values", () => {
      expect(DEFAULT_DETECTOR_CONFIG.polyfillsPath).toBe("");
      expect(DEFAULT_DETECTOR_CONFIG.filePattern).toBe("**/*.ts");
    });
  });

  describe("loadAnnotations", () => {
    test("returns empty map for non-existent file", () => {
      const annotations = loadAnnotations("/nonexistent/path.json");
      expect(annotations.size).toBe(0);
    });

    test("loads annotations from valid JSON array", async () => {
      // Create a temporary file with test data
      const testData: ApiAnnotation[] = [
        { fullPath: "Bun.test", notes: "Test annotation", maxCompleteness: 90 },
        { fullPath: "Bun.other", maxCompleteness: 50, limitations: ["No X"] },
      ];

      const tempPath = `/tmp/test-annotations-${Date.now()}.json`;
      await Bun.write(tempPath, JSON.stringify(testData));

      const annotations = loadAnnotations(tempPath);
      expect(annotations.size).toBe(2);
      expect(annotations.get("Bun.test")?.notes).toBe("Test annotation");
      expect(annotations.get("Bun.other")?.maxCompleteness).toBe(50);

      // Cleanup
      await Bun.file(tempPath).delete();
    });

    test("handles invalid JSON gracefully", async () => {
      const tempPath = `/tmp/test-invalid-${Date.now()}.json`;
      await Bun.write(tempPath, "not valid json");

      const annotations = loadAnnotations(tempPath);
      expect(annotations.size).toBe(0);

      // Cleanup
      await Bun.file(tempPath).delete();
    });
  });

  describe("getImplementationSummary", () => {
    const createMockImpl = (
      status: ApiImplementation["status"],
    ): ApiImplementation => ({
      api: {
        name: "test",
        fullPath: `Bun.test_${status}`,
        module: "bun",
        kind: "function",
        category: "utility",
        sourceFile: "test.d.ts",
        isRuntime: true,
      },
      status,
      completeness: status === "implemented" ? 100 : 0,
    });

    test("counts implementations by status", () => {
      const implementations = new Map<string, ApiImplementation>();
      implementations.set("impl1", createMockImpl("implemented"));
      implementations.set("impl2", createMockImpl("implemented"));
      implementations.set("partial1", createMockImpl("partial"));
      implementations.set("stub1", createMockImpl("stub"));
      implementations.set("not1", createMockImpl("not-started"));
      implementations.set("not2", createMockImpl("not-started"));

      const summary = getImplementationSummary(implementations);

      expect(summary.total).toBe(6);
      expect(summary.implemented).toBe(2);
      expect(summary.partial).toBe(1);
      expect(summary.stub).toBe(1);
      expect(summary.notStarted).toBe(2);
    });

    test("handles empty map", () => {
      const summary = getImplementationSummary(new Map());
      expect(summary.total).toBe(0);
      expect(summary.implemented).toBe(0);
      expect(summary.partial).toBe(0);
      expect(summary.stub).toBe(0);
      expect(summary.notStarted).toBe(0);
    });
  });

  describe("filterByStatus", () => {
    const createMockImpl = (
      name: string,
      status: ApiImplementation["status"],
    ): ApiImplementation => ({
      api: {
        name,
        fullPath: `Bun.${name}`,
        module: "bun",
        kind: "function",
        category: "utility",
        sourceFile: "test.d.ts",
        isRuntime: true,
      },
      status,
      completeness: status === "implemented" ? 100 : 0,
    });

    test("filters by implemented status", () => {
      const implementations = new Map<string, ApiImplementation>();
      implementations.set("impl1", createMockImpl("impl1", "implemented"));
      implementations.set("impl2", createMockImpl("impl2", "implemented"));
      implementations.set("partial1", createMockImpl("partial1", "partial"));
      implementations.set("not1", createMockImpl("not1", "not-started"));

      const filtered = filterByStatus(implementations, "implemented");
      expect(filtered).toHaveLength(2);
      expect(filtered.every((i) => i.status === "implemented")).toBe(true);
    });

    test("filters by partial status", () => {
      const implementations = new Map<string, ApiImplementation>();
      implementations.set("impl1", createMockImpl("impl1", "implemented"));
      implementations.set("partial1", createMockImpl("partial1", "partial"));
      implementations.set("partial2", createMockImpl("partial2", "partial"));

      const filtered = filterByStatus(implementations, "partial");
      expect(filtered).toHaveLength(2);
    });

    test("returns empty array when no matches", () => {
      const implementations = new Map<string, ApiImplementation>();
      implementations.set("impl1", createMockImpl("impl1", "implemented"));

      const filtered = filterByStatus(implementations, "stub");
      expect(filtered).toHaveLength(0);
    });
  });

  describe("sortByCompleteness", () => {
    const createMockImpl = (
      name: string,
      completeness: number,
    ): ApiImplementation => ({
      api: {
        name,
        fullPath: `Bun.${name}`,
        module: "bun",
        kind: "function",
        category: "utility",
        sourceFile: "test.d.ts",
        isRuntime: true,
      },
      status: completeness === 100 ? "implemented" : "partial",
      completeness,
    });

    test("sorts descending by default", () => {
      const implementations = new Map<string, ApiImplementation>();
      implementations.set("a", createMockImpl("a", 25));
      implementations.set("b", createMockImpl("b", 100));
      implementations.set("c", createMockImpl("c", 50));
      implementations.set("d", createMockImpl("d", 0));

      const sorted = sortByCompleteness(implementations);
      expect(sorted.map((i) => i.completeness)).toEqual([100, 50, 25, 0]);
    });

    test("sorts ascending when specified", () => {
      const implementations = new Map<string, ApiImplementation>();
      implementations.set("a", createMockImpl("a", 25));
      implementations.set("b", createMockImpl("b", 100));
      implementations.set("c", createMockImpl("c", 50));

      const sorted = sortByCompleteness(implementations, true);
      expect(sorted.map((i) => i.completeness)).toEqual([25, 50, 100]);
    });
  });
});
