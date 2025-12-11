// Glob polyfill: Bun.Glob
// Uses tinyglobby as backend (lighter alternative to fast-glob)

import { minimatch } from "minimatch";
import {
  type GlobOptions,
  glob as tinyGlob,
  globSync as tinyGlobSync,
} from "tinyglobby";
import type { PolyfillBun } from "./types.ts";

export interface GlobScanOptions {
  /**
   * The root directory to start matching from. Defaults to `process.cwd()`
   */
  cwd?: string;
  /**
   * Allow patterns to match entries that begin with a period (`.`).
   * @default false
   */
  dot?: boolean;
  /**
   * Return the absolute path for entries.
   * @default false
   */
  absolute?: boolean;
  /**
   * Indicates whether to traverse descendants of symbolic link directories.
   * @default false
   */
  followSymlinks?: boolean;
  /**
   * Throw an error when symbolic link is broken
   * @default false
   */
  throwErrorOnBrokenSymlink?: boolean;
  /**
   * Return only files.
   * @default true
   */
  onlyFiles?: boolean;
}

/**
 * Glob class for matching files using glob patterns
 */
export class Glob {
  readonly pattern: string;

  constructor(pattern: string) {
    if (typeof pattern !== "string") {
      throw new TypeError("Glob pattern must be a string");
    }
    this.pattern = pattern;
  }

  /**
   * Convert Bun GlobScanOptions to tinyglobby options
   */
  private toGlobOptions(optionsOrCwd?: string | GlobScanOptions): GlobOptions {
    const opts: GlobScanOptions =
      typeof optionsOrCwd === "string" ?
        { cwd: optionsOrCwd }
      : (optionsOrCwd ?? {});

    return {
      cwd: opts.cwd ?? process.cwd(),
      dot: opts.dot ?? false,
      absolute: opts.absolute ?? false,
      followSymbolicLinks: opts.followSymlinks ?? false,
      onlyFiles: opts.onlyFiles ?? true,
      // Disable expandDirectories for fast-glob compatibility
      expandDirectories: false,
    };
  }

  /**
   * Scan a root directory recursively for files that match this glob pattern.
   * Returns an async iterator.
   */
  async *scan(
    optionsOrCwd?: string | GlobScanOptions,
  ): AsyncIterableIterator<string> {
    const options = this.toGlobOptions(optionsOrCwd);
    const entries = await tinyGlob(this.pattern, options);

    for (const entry of entries) {
      yield entry;
    }
  }

  /**
   * Synchronously scan a root directory recursively for files that match this glob pattern.
   * Returns an iterator.
   */
  *scanSync(optionsOrCwd?: string | GlobScanOptions): IterableIterator<string> {
    const options = this.toGlobOptions(optionsOrCwd);
    const entries = tinyGlobSync(this.pattern, options);

    for (const entry of entries) {
      yield entry;
    }
  }

  /**
   * Match the glob against a string
   */
  match(str: string): boolean {
    return minimatch(str, this.pattern, { dot: true, matchBase: true });
  }
}

/**
 * Initialize Glob on the Bun object
 */
export function initGlob(bun: PolyfillBun): void {
  bun.Glob = Glob;
}
