import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "~/glob";

const TEST_DIR = join(import.meta.dirname, "__glob_test_fixtures__");

describe("Glob", () => {
  beforeAll(() => {
    // Create test fixture directory structure
    mkdirSync(TEST_DIR, { recursive: true });
    mkdirSync(join(TEST_DIR, "subdir"), { recursive: true });
    mkdirSync(join(TEST_DIR, ".hidden"), { recursive: true });

    writeFileSync(join(TEST_DIR, "file1.ts"), "export const a = 1;");
    writeFileSync(join(TEST_DIR, "file2.ts"), "export const b = 2;");
    writeFileSync(join(TEST_DIR, "file3.js"), "module.exports = 3;");
    writeFileSync(join(TEST_DIR, "readme.md"), "# Test");
    writeFileSync(join(TEST_DIR, ".dotfile"), "hidden");
    writeFileSync(join(TEST_DIR, "subdir/nested.ts"), "export const c = 3;");
    writeFileSync(join(TEST_DIR, ".hidden/secret.ts"), "export const d = 4;");
  });

  afterAll(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe("constructor", () => {
    test("accepts string pattern", () => {
      const glob = new Glob("*.ts");
      expect(glob.pattern).toBe("*.ts");
    });

    test("throws on non-string pattern", () => {
      expect(() => new Glob(123 as unknown as string)).toThrow(TypeError);
      expect(() => new Glob(null as unknown as string)).toThrow(TypeError);
    });
  });

  describe("match", () => {
    test("matches simple patterns", () => {
      const glob = new Glob("*.ts");
      expect(glob.match("file.ts")).toBe(true);
      expect(glob.match("file.js")).toBe(false);
      expect(glob.match("path/to/file.ts")).toBe(true); // matchBase enabled
    });

    test("matches glob star patterns", () => {
      const glob = new Glob("**/*.ts");
      expect(glob.match("file.ts")).toBe(true);
      expect(glob.match("src/file.ts")).toBe(true);
      expect(glob.match("src/deep/file.ts")).toBe(true);
      expect(glob.match("file.js")).toBe(false);
    });

    test("matches exact filenames", () => {
      const glob = new Glob("package.json");
      expect(glob.match("package.json")).toBe(true);
      expect(glob.match("package.lock")).toBe(false);
    });

    test("matches brace expansion", () => {
      const glob = new Glob("*.{ts,js}");
      expect(glob.match("file.ts")).toBe(true);
      expect(glob.match("file.js")).toBe(true);
      expect(glob.match("file.md")).toBe(false);
    });

    test("matches dotfiles when pattern starts with dot", () => {
      const glob = new Glob(".*");
      expect(glob.match(".gitignore")).toBe(true);
      expect(glob.match(".env")).toBe(true);
    });
  });

  describe("scanSync", () => {
    test("finds files matching pattern", () => {
      const glob = new Glob("*.ts");
      const results = Array.from(glob.scanSync(TEST_DIR));

      expect(results).toContain("file1.ts");
      expect(results).toContain("file2.ts");
      expect(results).not.toContain("file3.js");
      expect(results).not.toContain("readme.md");
    });

    test("finds files recursively with **", () => {
      const glob = new Glob("**/*.ts");
      const results = Array.from(glob.scanSync(TEST_DIR));

      expect(results).toContain("file1.ts");
      expect(results).toContain("file2.ts");
      expect(
        results.some((r) => r.includes("subdir") && r.endsWith("nested.ts")),
      ).toBe(true);
    });

    test("respects cwd as string", () => {
      const glob = new Glob("*.ts");
      const results = Array.from(glob.scanSync(TEST_DIR));
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    test("respects dot option", () => {
      const glob = new Glob("**/*.ts");

      const withoutDot = Array.from(
        glob.scanSync({ cwd: TEST_DIR, dot: false }),
      );
      const withDot = Array.from(glob.scanSync({ cwd: TEST_DIR, dot: true }));

      // .hidden/secret.ts should only appear with dot: true
      expect(withoutDot.some((r) => r.includes(".hidden"))).toBe(false);
      expect(withDot.some((r) => r.includes(".hidden"))).toBe(true);
    });

    test("respects absolute option", () => {
      const glob = new Glob("*.ts");

      const relative = Array.from(
        glob.scanSync({ cwd: TEST_DIR, absolute: false }),
      );
      const absolute = Array.from(
        glob.scanSync({ cwd: TEST_DIR, absolute: true }),
      );

      expect(relative[0]?.startsWith("/")).toBe(false);
      expect(absolute[0]?.startsWith("/")).toBe(true);
      expect(absolute[0]).toContain(TEST_DIR);
    });
  });

  describe("scan (async)", () => {
    test("finds files matching pattern", async () => {
      const glob = new Glob("*.ts");
      const results: string[] = [];

      for await (const file of glob.scan(TEST_DIR)) {
        results.push(file);
      }

      expect(results).toContain("file1.ts");
      expect(results).toContain("file2.ts");
      expect(results).not.toContain("file3.js");
    });

    test("finds files recursively", async () => {
      const glob = new Glob("**/*.ts");
      const results: string[] = [];

      for await (const file of glob.scan(TEST_DIR)) {
        results.push(file);
      }

      expect(results.length).toBeGreaterThanOrEqual(3); // file1.ts, file2.ts, subdir/nested.ts
      expect(results.some((r) => r.includes("nested.ts"))).toBe(true);
    });

    test("respects options", async () => {
      const glob = new Glob("**/*.ts");
      const results: string[] = [];

      for await (const file of glob.scan({ cwd: TEST_DIR, dot: true })) {
        results.push(file);
      }

      expect(results.some((r) => r.includes(".hidden"))).toBe(true);
    });
  });

  describe("edge cases", () => {
    test("handles empty results", () => {
      const glob = new Glob("*.nonexistent");
      const results = Array.from(glob.scanSync(TEST_DIR));
      expect(results).toEqual([]);
    });

    test("handles complex patterns", () => {
      const glob = new Glob("**/*.{ts,js}");
      const results = Array.from(glob.scanSync(TEST_DIR));

      expect(results.some((r) => r.endsWith(".ts"))).toBe(true);
      expect(results.some((r) => r.endsWith(".js"))).toBe(true);
      expect(results.some((r) => r.endsWith(".md"))).toBe(false);
    });
  });
});
