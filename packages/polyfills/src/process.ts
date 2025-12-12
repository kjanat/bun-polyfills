// Bun process utilities polyfill
// Covers: argv, main, which, sleep, sleepSync, nanoseconds, isMainThread, gc

import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { isMainThread as nodeIsMainThread } from "node:worker_threads";

import type { PolyfillBun } from "./types.ts";

// Cache for which results
const whichCache = new Map<string, string | null>();

/**
 * Cross-platform which implementation
 * Finds the full path to a command
 */
export function which(cmd: string, options?: { PATH?: string }): string | null {
  // Check cache first
  const cacheKey = `${cmd}:${options?.PATH ?? ""}`;
  if (whichCache.has(cacheKey)) {
    return whichCache.get(cacheKey) ?? null;
  }

  const pathEnv = options?.PATH ?? process.env.PATH ?? "";
  const isWindows = process.platform === "win32";
  const pathSep = isWindows ? ";" : ":";
  const pathExt =
    isWindows ?
      (process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";")
    : [""];

  const paths = pathEnv.split(pathSep);

  for (const dir of paths) {
    for (const ext of pathExt) {
      const fullPath = path.join(dir, cmd + ext);
      try {
        const stats = fs.statSync(fullPath);
        if (stats.isFile()) {
          // On Unix, check if executable
          if (!isWindows) {
            try {
              fs.accessSync(fullPath, fs.constants.X_OK);
            } catch {
              continue;
            }
          }
          whichCache.set(cacheKey, fullPath);
          return fullPath;
        }
      } catch {
        // File doesn't exist or can't be accessed
      }
    }
  }

  whichCache.set(cacheKey, null);
  return null;
}

/**
 * Synchronous which using native commands as fallback
 */
export function whichSync(cmd: string): string | null {
  // Try our implementation first
  const result = which(cmd);
  if (result) return result;

  // Fallback to native which/where command
  try {
    const isWindows = process.platform === "win32";
    const whichCmd = isWindows ? "where" : "which";
    const proc = spawnSync(whichCmd, [cmd], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });

    if (proc.status === 0 && proc.stdout) {
      const output = proc.stdout.toString().trim().split(/\r?\n/)[0];
      if (output) {
        whichCache.set(`${cmd}:`, output);
        return output;
      }
    }
  } catch {
    // Native which not available
  }

  return null;
}

/**
 * Sleep for specified milliseconds (async)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sleep synchronously (blocks the event loop)
 * Uses Atomics.wait for accurate timing
 */
export function sleepSync(ms: number): void {
  if (ms <= 0) return;

  const end = Date.now() + ms;

  // Use Atomics.wait for sub-millisecond accuracy when available
  const sab = new SharedArrayBuffer(4);
  const int32 = new Int32Array(sab);

  while (Date.now() < end) {
    const remaining = end - Date.now();
    if (remaining <= 0) break;

    // Atomics.wait with timeout - more accurate than busy loop
    void Atomics.wait(int32, 0, 0, Math.min(remaining, 100));
  }
}

/**
 * Get high-resolution nanoseconds
 * Returns nanoseconds since an arbitrary point in time
 */
export function nanoseconds(): bigint {
  return process.hrtime.bigint();
}

/**
 * Check if we're on the main thread
 */
export const isMainThread: boolean = nodeIsMainThread;

/**
 * Trigger garbage collection (noop if not exposed)
 */
export function gc(full?: boolean): void {
  // V8's gc() is only available with --expose-gc flag
  const globalGc = (globalThis as { gc?: (opts?: { type: string }) => void })
    .gc;
  if (typeof globalGc === "function") {
    globalGc(full ? { type: "major" } : undefined);
  }
  // Otherwise silently noop - matching Bun's behavior when gc isn't forced
}

/**
 * Initialize process utilities on Bun global
 */
export function initProcess(Bun: Partial<PolyfillBun>): void {
  // argv - just reference process.argv
  if (!("argv" in Bun)) {
    Object.defineProperty(Bun, "argv", {
      get: () => process.argv,
      enumerable: true,
    });
  }

  // main - entry point file
  if (!("main" in Bun)) {
    Object.defineProperty(Bun, "main", {
      get: () => process.argv[1] ?? "",
      enumerable: true,
    });
  }

  // which
  if (!("which" in Bun)) {
    Bun.which = which;
  }

  // sleep
  if (!("sleep" in Bun)) {
    Bun.sleep = sleep;
  }

  // sleepSync
  if (!("sleepSync" in Bun)) {
    Bun.sleepSync = sleepSync;
  }

  // nanoseconds
  if (!("nanoseconds" in Bun)) {
    Bun.nanoseconds = nanoseconds;
  }

  // isMainThread
  if (!("isMainThread" in Bun)) {
    Object.defineProperty(Bun, "isMainThread", {
      value: isMainThread,
      writable: false,
      enumerable: true,
    });
  }

  // gc
  if (!("gc" in Bun)) {
    Bun.gc = gc;
  }
}
