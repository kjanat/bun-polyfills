// Glob polyfill: Bun.Glob
// Uses fast-glob as backend

import fg from "fast-glob";
import { minimatch } from "minimatch";
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
   * Convert Bun GlobScanOptions to fast-glob options
   */
  private toFastGlobOptions(
    optionsOrCwd?: string | GlobScanOptions,
  ): fg.Options {
    const opts: GlobScanOptions =
      typeof optionsOrCwd === "string" ?
        { cwd: optionsOrCwd }
      : (optionsOrCwd ?? {});

    return {
      cwd: opts.cwd ?? process.cwd(),
      dot: opts.dot ?? false,
      absolute: opts.absolute ?? false,
      followSymbolicLinks: opts.followSymlinks ?? false,
      throwErrorOnBrokenSymbolicLink: opts.throwErrorOnBrokenSymlink ?? false,
      onlyFiles: opts.onlyFiles ?? true,
      // fast-glob specific defaults
      unique: true,
      markDirectories: false,
    };
  }

  /**
   * Scan a root directory recursively for files that match this glob pattern.
   * Returns an async iterator.
   */
  async *scan(
    optionsOrCwd?: string | GlobScanOptions,
  ): AsyncIterableIterator<string> {
    const options = this.toFastGlobOptions(optionsOrCwd);
    const stream = fg.stream(this.pattern, options);

    for await (const entry of stream) {
      yield entry.toString();
    }
  }

  /**
   * Synchronously scan a root directory recursively for files that match this glob pattern.
   * Returns an iterator.
   */
  *scanSync(optionsOrCwd?: string | GlobScanOptions): IterableIterator<string> {
    const options = this.toFastGlobOptions(optionsOrCwd);
    const entries = fg.sync(this.pattern, options);

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
