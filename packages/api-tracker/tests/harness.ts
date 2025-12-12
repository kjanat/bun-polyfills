/**
 * Test harness for polyfill compatibility testing
 * Adapted from Bun's test/harness.ts for running on Node.js with polyfills
 *
 * This file provides utilities that mirror Bun's test harness but work with
 * the polyfill implementations.
 */

import { beforeAll, describe, expect } from "bun:test";
import * as fs from "node:fs";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { gc as bunGC, which } from "bun";

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
    throw new Error(`${String(result.stderr)}\n${String(result.stdout)}`);
  }

  return {
    stdout: String(result.stdout ?? "").trim(),
    stderr: String(result.stderr ?? "").trim(),
  };
}

/**
 * Get the maximum file descriptor number (Unix only)
 * Reads /proc/self/fd (Linux) or /dev/fd (macOS) to find highest open FD
 */
export function getMaxFD(): number {
  if (isWindows) return -1;

  const fdDir = isMacOS ? "/dev/fd" : "/proc/self/fd";
  try {
    let max = -1;
    for (const entry of fs.readdirSync(fdDir)) {
      const fd = parseInt(entry.trim(), 10);
      if (Number.isSafeInteger(fd) && fd >= 0) {
        max = Math.max(max, fd);
      }
    }
    if (max >= 0) return max;
  } catch {
    // Fallback: open /dev/null and use its FD
  }

  try {
    const fd = fs.openSync("/dev/null", "r");
    fs.closeSync(fd);
    return fd;
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

/**
 * Run a script that should produce an error
 */
export function runWithErrorPromise(
  args: string[],
): Promise<{ exitCode: number; stderr: string; stdout: string }> {
  return new Promise((resolve) => {
    const proc = Bun.spawn(args, {
      stdout: "pipe",
      stderr: "pipe",
      env: bunEnv,
    });

    Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]).then(([stdout, stderr, exitCode]) => {
      resolve({ exitCode, stderr, stdout });
    });
  });
}

/**
 * File descriptor leak checker for tests
 * Captures initial FD count and checks for leaks on dispose
 */
export function fileDescriptorLeakChecker(): Disposable {
  const initial = getMaxFD();
  return {
    [Symbol.dispose]() {
      if (initial < 0) return; // Skip on Windows or if FD detection unavailable
      const current = getMaxFD();
      if (current > initial) {
        throw new Error(
          `File descriptor leak detected: ${current} (current) > ${initial} (initial)`,
        );
      }
    },
  };
}

/**
 * Check if running under ASAN (Address Sanitizer)
 */
export const isASAN = process.env.ASAN === "1";

/**
 * Normalize Bun.inspect() output for snapshot comparisons
 * Replaces platform-specific paths and memory addresses
 */
export function normalizeBunSnapshot(str: string): string {
  return str
    .replace(/0x[0-9a-fA-F]+/g, "0xPTR") // Memory addresses
    .replace(/\d{4,}/g, (match) => (match.length > 6 ? "NNNNNN" : match)) // Large numbers
    .replace(/at <anonymous> \([^)]+:\d+:\d+\)/g, "at <anonymous> (file:NN:NN)") // Stack traces
    .replace(/\/[^\s)]+\.(js|ts|mjs|cjs):\d+:\d+/g, "file:NN:NN"); // File paths with line numbers
}

// ============================================================================
// Unicode Surrogate Helpers for UTF-16 validation tests
// ============================================================================

/**
 * Generate a random integer between min and max (inclusive)
 */
function randomIntBetween(min: number, max: number): number {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

/**
 * Generate a random lone high surrogate (U+D800-U+DBFF)
 * These are invalid as standalone characters in UTF-16
 */
export function randomLoneHighSurrogate(): string {
  return String.fromCharCode(randomIntBetween(0xd800, 0xdbff));
}

/**
 * Generate a random lone low surrogate (U+DC00-U+DFFF)
 * These are invalid as standalone characters in UTF-16
 */
export function randomLoneLowSurrogate(): string {
  return String.fromCharCode(randomIntBetween(0xdc00, 0xdfff));
}

/**
 * Generate a random lone surrogate (either high or low)
 * Lone surrogates are invalid in well-formed UTF-16
 */
export function randomLoneSurrogate(): string {
  return Math.random() < 0.5 ?
      randomLoneHighSurrogate()
    : randomLoneLowSurrogate();
}

/**
 * Generate an invalid surrogate pair (low + high, wrong order)
 * Valid UTF-16 requires high + low order; this returns the inverse
 */
export function randomInvalidSurrogatePair(): string {
  const low = randomLoneLowSurrogate();
  const high = randomLoneHighSurrogate();
  return `${low}${high}`; // Wrong order - should be high+low
}

/**
 * Run a callback and capture any thrown error (async version)
 */
export async function runWithErrorCallback(
  cb: () => unknown,
): Promise<Error | undefined> {
  try {
    await cb();
  } catch (e) {
    return e as Error;
  }
  return undefined;
}

// Re-export test utilities from bun:test
export { beforeAll, describe, expect };
