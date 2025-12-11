/**
 * Test harness for polyfill compatibility testing
 * Adapted from Bun's test/harness.ts for running on Node.js with polyfills
 *
 * This file provides utilities that mirror Bun's test harness but work with
 * the polyfill implementations.
 */

import { gc as bunGC, which } from "bun";
import { beforeAll, describe, expect } from "bun:test";
import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// Platform detection
export const isMacOS = process.platform === "darwin";
export const isLinux = process.platform === "linux";
export const isPosix = isMacOS || isLinux;
export const isWindows = process.platform === "win32";
export const isIntelMacOS = isMacOS && process.arch === "x64";
export const isArm64 = process.arch === "arm64";
export const isCI = process.env.CI !== undefined;

// Test environment flags
export const isFlaky = isCI;
export const isBroken = isCI;

// Standard test environment
export const bunEnv: NodeJS.Dict<string> = {
  ...process.env,
  GITHUB_ACTIONS: "false",
  NO_COLOR: "1",
  FORCE_COLOR: undefined,
  TZ: "Etc/UTC",
  CI: "1",
};

// Clean up undefined values
for (const key in bunEnv) {
  if (bunEnv[key] === undefined) {
    delete bunEnv[key];
  }
}

/**
 * Get path to bun executable
 * In polyfill tests, we typically use the actual bun for running tests
 */
export function bunExe(): string {
  if (isWindows) return process.execPath.replace(/\\/g, "/");
  return process.execPath;
}

/**
 * Get path to node executable
 */
export function nodeExe(): string | null {
  return which("node") || null;
}

/**
 * Get path to shell executable
 */
export function shellExe(): string {
  return isWindows ? "pwsh" : "bash";
}

/**
 * Trigger garbage collection
 */
export function gc(force = true): void {
  bunGC(force);
}

/**
 * GC tick for ensuring finalizers run
 */
export function gcTick(trace = false): Promise<void> {
  if (trace) console.trace("");
  gc();
  return Bun.sleep(0);
}

/**
 * Directory tree type for creating test fixtures
 */
export type DirectoryTree = { [name: string]: string | Buffer | DirectoryTree };

/**
 * Create a directory tree synchronously
 */
export function makeTreeSync(base: string, tree: DirectoryTree | string): void {
  if (typeof tree === "string") {
    fs.cpSync(tree, base, { recursive: true });
    return;
  }

  const isDirectoryTree = (
    value: string | DirectoryTree | Buffer,
  ): value is DirectoryTree =>
    typeof value === "object" && value !== null && !Buffer.isBuffer(value);

  for (const [name, contents] of Object.entries(tree)) {
    const joined = path.join(base, name);

    if (name.includes("/")) {
      const dir = path.dirname(name);
      if (dir !== name && dir !== ".") {
        mkdirSync(path.join(base, dir), { recursive: true });
      }
    }

    if (isDirectoryTree(contents)) {
      mkdirSync(joined, { recursive: true });
      makeTreeSync(joined, contents);
      continue;
    }

    writeFileSync(joined, contents);
  }
}

/**
 * Create a temporary directory
 */
export function tmpdirSync(): string {
  return mkdtempSync(path.join(os.tmpdir(), "polyfill-test-"));
}

/**
 * Create a temporary directory with files
 */
export function tempDirWithFiles(
  basename: string,
  filesOrPath: DirectoryTree | string,
): string {
  const base = mkdtempSync(
    path.join(fs.realpathSync(os.tmpdir()), `${basename}_`),
  );
  makeTreeSync(base, filesOrPath);
  return base;
}

/**
 * Run a command and return stdout/stderr
 */
export function bunRun(
  file: string,
  env?: Record<string, string> | NodeJS.ProcessEnv,
): { stdout: string; stderr: string } {
  const result = Bun.spawnSync([bunExe(), file], {
    cwd: path.dirname(file),
    env: { ...bunEnv, ...env },
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });

  if (!result.success) {
    throw new Error(String(result.stderr) + "\n" + String(result.stdout));
  }

  return {
    stdout: String(result.stdout ?? "").trim(),
    stderr: String(result.stderr ?? "").trim(),
  };
}

/**
 * Get the maximum file descriptor number (Unix only)
 */
export function getMaxFD(): number {
  if (isWindows) return -1;
  try {
    const result = execSync("ulimit -n", { encoding: "utf8" });
    return parseInt(result.trim(), 10);
  } catch {
    return -1;
  }
}

/**
 * Run code without aggressive GC
 */
export function withoutAggressiveGC<T>(block: () => T): T {
  // In polyfill tests, we don't have Bun's aggressive GC
  return block();
}

/**
 * Hide a function from stack traces
 */
export function hideFromStackTrace(block: CallableFunction): void {
  Object.defineProperty(block, "name", {
    value: "::bunternal::",
    configurable: true,
    enumerable: true,
    writable: true,
  });
}

// Re-export test utilities from bun:test
export { beforeAll, describe, expect };
