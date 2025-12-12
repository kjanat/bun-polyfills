// Bun.$ shell polyfill - wrapper around zx

import { $, type ProcessOutput, type ProcessPromise } from "zx";

import type { PolyfillBun, ShellFunction } from "./types.ts";

/**
 * Bun-compatible ShellOutput that wraps zx's ProcessOutput
 */
export class ShellOutput {
  readonly stdout: Buffer;
  readonly stderr: Buffer;
  readonly exitCode: number;

  constructor(output: ProcessOutput) {
    this.stdout = Buffer.from(output.stdout);
    this.stderr = Buffer.from(output.stderr);
    this.exitCode = output.exitCode ?? 0;
  }

  text(encoding?: BufferEncoding): string {
    return this.stdout.toString(encoding ?? "utf-8");
  }

  json<T = unknown>(): T {
    return JSON.parse(this.text()) as T;
  }

  arrayBuffer(): ArrayBuffer {
    const buf = this.stdout.buffer.slice(
      this.stdout.byteOffset,
      this.stdout.byteOffset + this.stdout.byteLength,
    );
    return buf as ArrayBuffer;
  }

  blob(): Blob {
    return new Blob([new Uint8Array(this.stdout)]);
  }

  bytes(): Uint8Array {
    return new Uint8Array(this.stdout);
  }
}

/**
 * Bun-compatible ShellPromise interface
 */
export interface ShellPromise extends Promise<ShellOutput> {
  readonly stdin: WritableStream;
  cwd(newCwd: string): ShellPromise;
  env(newEnv: Record<string, string | undefined>): ShellPromise;
  quiet(isQuiet?: boolean): ShellPromise;
  nothrow(): ShellPromise;
  throws(shouldThrow: boolean): ShellPromise;
  lines(): AsyncIterable<string>;
  text(encoding?: BufferEncoding): Promise<string>;
  json<T = unknown>(): Promise<T>;
  arrayBuffer(): Promise<ArrayBuffer>;
  blob(): Promise<Blob>;
}

/**
 * Creates a Bun.$-compatible shell promise wrapper around zx
 */
function createShellPromise(zxProc: ProcessPromise): ShellPromise {
  // Wrap the zx promise to return ShellOutput
  const resultPromise = zxProc.then(
    (output) => new ShellOutput(output),
  ) as ShellPromise;

  // Define methods on the promise
  Object.defineProperties(resultPromise, {
    stdin: {
      get(): WritableStream {
        const nodeWritable = zxProc.stdin;
        if (!nodeWritable) {
          throw new Error("stdin is not available");
        }
        return new WritableStream({
          write(chunk) {
            return new Promise((resolve, reject) => {
              const ok = nodeWritable.write(
                chunk,
                (err: Error | null | undefined) => {
                  if (err) reject(err);
                  else resolve();
                },
              );
              if (ok) resolve();
            });
          },
          close() {
            return new Promise<void>((resolve) => {
              nodeWritable.end(resolve);
            });
          },
        });
      },
    },
    cwd: {
      value(_newCwd: string): ShellPromise {
        // zx doesn't have per-command cwd on promise
        return createShellPromise(zxProc);
      },
    },
    env: {
      value(_newEnv: Record<string, string | undefined>): ShellPromise {
        // zx doesn't have per-command env on promise
        return createShellPromise(zxProc);
      },
    },
    quiet: {
      value(isQuiet = true): ShellPromise {
        return createShellPromise(zxProc.quiet(isQuiet));
      },
    },
    nothrow: {
      value(): ShellPromise {
        return createShellPromise(zxProc.nothrow());
      },
    },
    throws: {
      value(shouldThrow: boolean): ShellPromise {
        return createShellPromise(zxProc.nothrow(!shouldThrow));
      },
    },
    lines: {
      async *value(): AsyncIterable<string> {
        const output = await resultPromise;
        const lines = output.text().split("\n");
        for (const line of lines) {
          if (line) yield line;
        }
      },
    },
    text: {
      async value(encoding?: BufferEncoding): Promise<string> {
        const output = await resultPromise;
        return output.text(encoding);
      },
    },
    json: {
      async value<T = unknown>(): Promise<T> {
        const output = await resultPromise;
        return output.json<T>();
      },
    },
    arrayBuffer: {
      async value(): Promise<ArrayBuffer> {
        const output = await resultPromise;
        return (output as ShellOutput).arrayBuffer();
      },
    },
    blob: {
      async value(): Promise<Blob> {
        const output = await resultPromise;
        return output.blob();
      },
    },
  });

  return resultPromise;
}

// ShellFunction type is exported from types.ts

/**
 * Initialize the Bun.$ polyfill using zx as backend
 */
export function initShell(Bun: Partial<PolyfillBun>): void {
  if ("$" in Bun && !process.env.BUN_POLYFILLS_FORCE) return;
  if (process.env.BUN_POLYFILLS_FORCE) {
    console.error(
      "!!! BUN_POLYFILLS_FORCE active - overriding native Bun.$ !!!",
    );
  }

  const shell: ShellFunction = (
    strings: TemplateStringsArray | string,
    ...values: unknown[]
  ): ShellPromise => {
    // Normalize string to TemplateStringsArray-like object
    let templateStrings: TemplateStringsArray;
    if (typeof strings === "string") {
      const arr = [strings] as string[] & { raw: string[] };
      arr.raw = [strings];
      templateStrings = arr as TemplateStringsArray;
    } else {
      templateStrings = strings;
    }

    // Use zx's tagged template function
    const zxProc = $(templateStrings, ...(values as string[]));
    return createShellPromise(zxProc);
  };

  Bun.$ = shell;
}
