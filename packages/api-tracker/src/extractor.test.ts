import { describe, expect, test } from "bun:test";
import ts from "typescript";

import {
  DEFAULT_EXTRACTOR_CONFIG,
  filterByCategory,
  filterByModule,
  flattenApis,
  getApiKind,
  getBunTypesVersion,
  getTopLevelApis,
  resolveBunTypesPath,
} from "./extractor";
import type { BunApi } from "./types";

describe("extractor", () => {
  describe("DEFAULT_EXTRACTOR_CONFIG", () => {
    test("has expected default values", () => {
      expect(DEFAULT_EXTRACTOR_CONFIG.bunTypesPath).toBe("");
      expect(DEFAULT_EXTRACTOR_CONFIG.modules).toContain("bun");
      expect(DEFAULT_EXTRACTOR_CONFIG.modules).toContain("bun:sqlite");
      expect(DEFAULT_EXTRACTOR_CONFIG.modules).toContain("bun:ffi");
      expect(DEFAULT_EXTRACTOR_CONFIG.includeInternal).toBe(false);
      expect(DEFAULT_EXTRACTOR_CONFIG.includeDeprecated).toBe(false);
      expect(DEFAULT_EXTRACTOR_CONFIG.maxDepth).toBe(3);
    });
  });

  describe("resolveBunTypesPath", () => {
    test("resolves @types/bun from node_modules", () => {
      const path = resolveBunTypesPath();
      expect(path).toContain("bun-types");
      expect(typeof path).toBe("string");
    });

    test("throws if @types/bun not found", () => {
      expect(() => resolveBunTypesPath("/nonexistent/path")).toThrow(
        "Could not find @types/bun",
      );
    });
  });

  describe("getBunTypesVersion", () => {
    test("returns version from package.json", () => {
      const bunTypesPath = resolveBunTypesPath();
      const version = getBunTypesVersion(bunTypesPath);
      expect(version).toMatch(/^\d+\.\d+\.\d+/);
    });

    test("returns 'unknown' for invalid path", () => {
      const version = getBunTypesVersion("/nonexistent/path");
      expect(version).toBe("unknown");
    });
  });

  describe("getApiKind", () => {
    test("identifies function declarations", () => {
      const code = "function foo() {}";
      const sourceFile = ts.createSourceFile(
        "test.ts",
        code,
        ts.ScriptTarget.Latest,
        true,
      );
      const funcNode = sourceFile.statements[0];
      if (funcNode) {
        expect(getApiKind(funcNode)).toBe("function");
      }
    });

    test("identifies class declarations", () => {
      const code = "class Foo {}";
      const sourceFile = ts.createSourceFile(
        "test.ts",
        code,
        ts.ScriptTarget.Latest,
        true,
      );
      const classNode = sourceFile.statements[0];
      if (classNode) {
        expect(getApiKind(classNode)).toBe("class");
      }
    });

    test("identifies interface declarations", () => {
      const code = "interface Foo {}";
      const sourceFile = ts.createSourceFile(
        "test.ts",
        code,
        ts.ScriptTarget.Latest,
        true,
      );
      const ifaceNode = sourceFile.statements[0];
      if (ifaceNode) {
        expect(getApiKind(ifaceNode)).toBe("interface");
      }
    });

    test("identifies type alias declarations", () => {
      const code = "type Foo = string;";
      const sourceFile = ts.createSourceFile(
        "test.ts",
        code,
        ts.ScriptTarget.Latest,
        true,
      );
      const typeNode = sourceFile.statements[0];
      if (typeNode) {
        expect(getApiKind(typeNode)).toBe("type");
      }
    });

    test("identifies module/namespace declarations", () => {
      const code = "namespace Foo {}";
      const sourceFile = ts.createSourceFile(
        "test.ts",
        code,
        ts.ScriptTarget.Latest,
        true,
      );
      const nsNode = sourceFile.statements[0];
      if (nsNode) {
        expect(getApiKind(nsNode)).toBe("namespace");
      }
    });
  });

  describe("flattenApis", () => {
    const mockApis: BunApi[] = [
      {
        name: "parent",
        fullPath: "Bun.parent",
        module: "bun",
        kind: "namespace",
        category: "utility",
        sourceFile: "test.d.ts",
        isRuntime: true,
        children: [
          {
            name: "child1",
            fullPath: "Bun.parent.child1",
            module: "bun",
            kind: "function",
            category: "utility",
            sourceFile: "test.d.ts",
            isRuntime: true,
            parent: "Bun.parent",
          },
          {
            name: "child2",
            fullPath: "Bun.parent.child2",
            module: "bun",
            kind: "function",
            category: "utility",
            sourceFile: "test.d.ts",
            isRuntime: true,
            parent: "Bun.parent",
          },
        ],
      },
      {
        name: "standalone",
        fullPath: "Bun.standalone",
        module: "bun",
        kind: "function",
        category: "utility",
        sourceFile: "test.d.ts",
        isRuntime: true,
      },
    ];

    test("flattens nested APIs", () => {
      const flattened = flattenApis(mockApis);
      expect(flattened).toHaveLength(4);
      expect(flattened.map((a) => a.fullPath)).toEqual([
        "Bun.parent",
        "Bun.parent.child1",
        "Bun.parent.child2",
        "Bun.standalone",
      ]);
    });

    test("handles empty array", () => {
      const flattened = flattenApis([]);
      expect(flattened).toEqual([]);
    });

    test("handles APIs without children", () => {
      const apis: BunApi[] = [
        {
          name: "simple",
          fullPath: "Bun.simple",
          module: "bun",
          kind: "function",
          category: "utility",
          sourceFile: "test.d.ts",
          isRuntime: true,
        },
      ];
      const flattened = flattenApis(apis);
      expect(flattened).toHaveLength(1);
    });

    test("flattens deeply nested APIs (3+ levels)", () => {
      const deepApis: BunApi[] = [
        {
          name: "root",
          fullPath: "Bun.root",
          module: "bun",
          kind: "namespace",
          category: "utility",
          sourceFile: "test.d.ts",
          isRuntime: true,
          children: [
            {
              name: "level1",
              fullPath: "Bun.root.level1",
              module: "bun",
              kind: "namespace",
              category: "utility",
              sourceFile: "test.d.ts",
              isRuntime: true,
              parent: "Bun.root",
              children: [
                {
                  name: "level2",
                  fullPath: "Bun.root.level1.level2",
                  module: "bun",
                  kind: "namespace",
                  category: "utility",
                  sourceFile: "test.d.ts",
                  isRuntime: true,
                  parent: "Bun.root.level1",
                  children: [
                    {
                      name: "level3",
                      fullPath: "Bun.root.level1.level2.level3",
                      module: "bun",
                      kind: "function",
                      category: "utility",
                      sourceFile: "test.d.ts",
                      isRuntime: true,
                      parent: "Bun.root.level1.level2",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      const flattened = flattenApis(deepApis);
      expect(flattened).toHaveLength(4);
      expect(flattened.map((a) => a.fullPath)).toEqual([
        "Bun.root",
        "Bun.root.level1",
        "Bun.root.level1.level2",
        "Bun.root.level1.level2.level3",
      ]);
    });
  });

  describe("getTopLevelApis", () => {
    const mockApis: BunApi[] = [
      {
        name: "parent",
        fullPath: "Bun.parent",
        module: "bun",
        kind: "namespace",
        category: "utility",
        sourceFile: "test.d.ts",
        isRuntime: true,
      },
      {
        name: "child",
        fullPath: "Bun.parent.child",
        module: "bun",
        kind: "function",
        category: "utility",
        sourceFile: "test.d.ts",
        isRuntime: true,
        parent: "Bun.parent",
      },
      {
        name: "standalone",
        fullPath: "Bun.standalone",
        module: "bun",
        kind: "function",
        category: "utility",
        sourceFile: "test.d.ts",
        isRuntime: true,
      },
    ];

    test("returns only top-level APIs (no parent)", () => {
      const topLevel = getTopLevelApis(mockApis);
      expect(topLevel).toHaveLength(2);
      expect(topLevel.map((a) => a.fullPath)).toEqual([
        "Bun.parent",
        "Bun.standalone",
      ]);
    });
  });

  describe("filterByCategory", () => {
    const mockApis: BunApi[] = [
      {
        name: "file",
        fullPath: "Bun.file",
        module: "bun",
        kind: "function",
        category: "filesystem",
        sourceFile: "test.d.ts",
        isRuntime: true,
      },
      {
        name: "spawn",
        fullPath: "Bun.spawn",
        module: "bun",
        kind: "function",
        category: "process",
        sourceFile: "test.d.ts",
        isRuntime: true,
      },
      {
        name: "write",
        fullPath: "Bun.write",
        module: "bun",
        kind: "function",
        category: "filesystem",
        sourceFile: "test.d.ts",
        isRuntime: true,
      },
    ];

    test("filters by filesystem category", () => {
      const filtered = filterByCategory(mockApis, "filesystem");
      expect(filtered).toHaveLength(2);
      expect(filtered.every((a) => a.category === "filesystem")).toBe(true);
    });

    test("filters by process category", () => {
      const filtered = filterByCategory(mockApis, "process");
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.fullPath).toBe("Bun.spawn");
    });

    test("returns empty for non-matching category", () => {
      const filtered = filterByCategory(mockApis, "crypto");
      expect(filtered).toHaveLength(0);
    });
  });

  describe("filterByModule", () => {
    const mockApis: BunApi[] = [
      {
        name: "file",
        fullPath: "Bun.file",
        module: "bun",
        kind: "function",
        category: "filesystem",
        sourceFile: "test.d.ts",
        isRuntime: true,
      },
      {
        name: "Database",
        fullPath: "Database",
        module: "bun:sqlite",
        kind: "class",
        category: "database",
        sourceFile: "sqlite.d.ts",
        isRuntime: true,
      },
      {
        name: "dlopen",
        fullPath: "dlopen",
        module: "bun:ffi",
        kind: "function",
        category: "ffi",
        sourceFile: "ffi.d.ts",
        isRuntime: true,
      },
    ];

    test("filters by bun module", () => {
      const filtered = filterByModule(mockApis, "bun");
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.module).toBe("bun");
    });

    test("filters by bun:sqlite module", () => {
      const filtered = filterByModule(mockApis, "bun:sqlite");
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.name).toBe("Database");
    });

    test("filters by bun:ffi module", () => {
      const filtered = filterByModule(mockApis, "bun:ffi");
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.name).toBe("dlopen");
    });
  });
});
