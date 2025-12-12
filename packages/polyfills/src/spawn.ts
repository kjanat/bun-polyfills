// Bun.spawn() and Bun.spawnSync() polyfills using node:child_process
//
// LIMITATIONS:
// - resourceUsage() returns empty stub (Node.js doesn't expose child process resource usage)
// - Advanced stdio inputs (BunFile, ArrayBufferView, ReadableStream, Blob, Response, Request)
//   are not piped to stdin; they default to "pipe" mode requiring manual writes
// - FileSink.flush() is a no-op (Node.js writable streams don't have explicit flush)
// - IPC serialization "advanced" mode uses Node's default serialization (v8.serialize)
// - exitedDueToTimeout only detected when signal is SIGTERM (may miss custom killSignal timeouts)

import type { IOType, Serializable, StdioOptions } from "node:child_process";
import {
  type ChildProcess,
  spawn as nodeSpawn,
  spawnSync as nodeSpawnSync,
  type SpawnSyncReturns,
} from "node:child_process";
import type {
  Readable as NodeReadable,
  Writable as NodeWritable,
} from "node:stream";

import type { PolyfillBun, PolyfillBunFile } from "./types.ts";

// ============================================================================
// Types
// ============================================================================

export interface ResourceUsage {
  contextSwitches: { voluntary: number; involuntary: number };
  cpuTime: { user: number; system: number; total: number };
  maxRSS: number;
  messages: { sent: number; received: number };
  ops: { in: number; out: number };
  shmSize: number;
  signalCount: number;
  swapCount: number;
}

export interface FileSink {
  write(data: string | Uint8Array | ArrayBuffer): number;
  flush(): void;
  end(): void;
}

export interface Subprocess extends AsyncDisposable {
  readonly stdin: FileSink | number | undefined;
  readonly stdout: ReadableStream<Uint8Array> | number | undefined;
  readonly stderr: ReadableStream<Uint8Array> | number | undefined;
  readonly readable: ReadableStream<Uint8Array> | number | undefined;
  readonly pid: number;
  readonly exited: Promise<number>;
  readonly exitCode: number | null;
  readonly signalCode: NodeJS.Signals | null;
  readonly killed: boolean;

  kill(exitCode?: number | NodeJS.Signals): void;
  ref(): void;
  unref(): void;
  send(message: unknown): void;
  disconnect(): void;
  resourceUsage(): ResourceUsage | undefined;
}

export interface SyncSubprocess {
  stdout: Buffer | undefined;
  stderr: Buffer | undefined;
  exitCode: number;
  success: boolean;
  resourceUsage: ResourceUsage;
  signalCode?: string;
  exitedDueToTimeout?: true;
  pid: number;
}

export type SpawnReadable =
  | "pipe"
  | "inherit"
  | "ignore"
  | null
  | undefined
  | PolyfillBunFile
  | ArrayBufferView
  | number;

export type SpawnWritable =
  | "pipe"
  | "inherit"
  | "ignore"
  | null
  | undefined
  | PolyfillBunFile
  | ArrayBufferView
  | number
  | ReadableStream
  | Blob
  | Response
  | Request;

export interface SpawnOptionsObject {
  cwd?: string;
  env?: Record<string, string | undefined>;
  stdio?: [SpawnWritable, SpawnReadable, SpawnReadable];
  stdin?: SpawnWritable;
  stdout?: SpawnReadable;
  stderr?: SpawnReadable;
  onExit?(
    subprocess: Subprocess,
    exitCode: number | null,
    signalCode: number | null,
    error?: Error,
  ): void | Promise<void>;
  ipc?(message: unknown, subprocess: Subprocess): void;
  serialization?: "json" | "advanced";
  windowsHide?: boolean;
  windowsVerbatimArguments?: boolean;
  argv0?: string;
  signal?: AbortSignal;
  timeout?: number;
  killSignal?: string | number;
  maxBuffer?: number;
}

// ============================================================================
// Helpers
// ============================================================================

function createEmptyResourceUsage(): ResourceUsage {
  return {
    contextSwitches: { voluntary: 0, involuntary: 0 },
    cpuTime: { user: 0, system: 0, total: 0 },
    maxRSS: 0,
    messages: { sent: 0, received: 0 },
    ops: { in: 0, out: 0 },
    shmSize: 0,
    signalCount: 0,
    swapCount: 0,
  };
}

function mapStdioOption(
  opt: SpawnReadable | SpawnWritable,
): IOType | number | null | undefined {
  if (opt === null || opt === "ignore") return "ignore";
  if (opt === undefined) return "pipe";
  if (opt === "pipe" || opt === "inherit") return opt;
  if (typeof opt === "number") return opt;
  // For BunFile, ArrayBufferView, ReadableStream, etc. - default to pipe
  return "pipe";
}

function nodeReadableToWebStream(
  nodeStream: NodeReadable,
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream.on("data", (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk));
      });
      nodeStream.on("end", () => {
        controller.close();
      });
      nodeStream.on("error", (err) => {
        controller.error(err);
      });
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}

function createFileSink(nodeStream: NodeWritable): FileSink {
  return {
    write(data: string | Uint8Array | ArrayBuffer): number {
      let buffer: Buffer;
      if (typeof data === "string") {
        buffer = Buffer.from(data);
      } else if (data instanceof ArrayBuffer) {
        buffer = Buffer.from(new Uint8Array(data));
      } else {
        buffer = Buffer.from(data);
      }
      nodeStream.write(buffer);
      return buffer.length;
    },
    flush(): void {
      // Node streams don't have explicit flush for write streams
    },
    end(): void {
      nodeStream.end();
    },
  };
}

// ============================================================================
// Subprocess Implementation
// ============================================================================

class SubprocessImpl implements Subprocess {
  readonly pid: number;
  readonly stdin: FileSink | number | undefined;
  readonly stdout: ReadableStream<Uint8Array> | number | undefined;
  readonly stderr: ReadableStream<Uint8Array> | number | undefined;
  readonly readable: ReadableStream<Uint8Array> | number | undefined;
  readonly exited: Promise<number>;

  private _exitCode: number | null = null;
  private _signalCode: NodeJS.Signals | null = null;
  private _killed = false;
  private readonly _proc: ChildProcess;

  constructor(proc: ChildProcess, options?: SpawnOptionsObject) {
    this._proc = proc;
    this.pid = proc.pid ?? -1;

    // stdin
    if (proc.stdin) {
      this.stdin = createFileSink(proc.stdin);
    } else {
      this.stdin = undefined;
    }

    // stdout
    if (proc.stdout) {
      this.stdout = nodeReadableToWebStream(proc.stdout);
      this.readable = this.stdout;
    } else {
      this.stdout = undefined;
      this.readable = undefined;
    }

    // stderr
    if (proc.stderr) {
      this.stderr = nodeReadableToWebStream(proc.stderr);
    } else {
      this.stderr = undefined;
    }

    // exited promise
    this.exited = new Promise<number>((resolve) => {
      proc.on("exit", (code, signal) => {
        this._exitCode = code;
        this._signalCode = signal as NodeJS.Signals | null;
        if (signal) this._killed = true;

        // Call onExit callback if provided
        if (options?.onExit) {
          const error =
            code !== 0 ?
              new Error(`Process exited with code ${code}`)
            : undefined;
          Promise.resolve(options.onExit(this, code, signal ? 1 : null, error));
        }

        resolve(code ?? 0);
      });

      proc.on("error", (err) => {
        if (options?.onExit) {
          Promise.resolve(options.onExit(this, null, null, err));
        }
        resolve(-1);
      });
    });

    // Handle abort signal
    if (options?.signal) {
      options.signal.addEventListener("abort", () => {
        this.kill();
      });
    }

    // Handle timeout
    if (options?.timeout && options.timeout > 0) {
      setTimeout(() => {
        if (this._exitCode === null) {
          this.kill(options.killSignal as NodeJS.Signals | undefined);
        }
      }, options.timeout);
    }

    // Handle IPC
    if (options?.ipc && proc.channel) {
      const ipc = options.ipc;

      proc.on("message", (message) => {
        ipc(message, this);
      });
    }
  }

  get exitCode(): number | null {
    return this._exitCode;
  }

  get signalCode(): NodeJS.Signals | null {
    return this._signalCode;
  }

  get killed(): boolean {
    return this._killed;
  }

  kill(exitCode?: number | NodeJS.Signals): void {
    this._killed = true;
    if (typeof exitCode === "string") {
      this._proc.kill(exitCode);
    } else if (typeof exitCode === "number") {
      this._proc.kill(exitCode as unknown as NodeJS.Signals);
    } else {
      this._proc.kill();
    }
  }

  ref(): void {
    this._proc.ref();
  }

  unref(): void {
    this._proc.unref();
  }

  send(message: unknown): void {
    if (this._proc.send) {
      this._proc.send(message as Serializable);
    }
  }

  disconnect(): void {
    if (this._proc.disconnect) {
      this._proc.disconnect();
    }
  }

  resourceUsage(): ResourceUsage | undefined {
    // Node.js doesn't provide detailed resource usage for child processes
    return createEmptyResourceUsage();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    if (this._exitCode === null) {
      this.kill();
    }
    await this.exited;
  }
}

// ============================================================================
// spawn() Implementation
// ============================================================================

type SpawnArgs =
  | [command: string[], options?: SpawnOptionsObject]
  | [options: { cmd: string[] } & SpawnOptionsObject];

function parseSpawnArgs(args: SpawnArgs): {
  command: string[];
  options: SpawnOptionsObject;
} {
  if (Array.isArray(args[0])) {
    return { command: args[0], options: args[1] ?? {} };
  } else {
    const { cmd, ...options } = args[0];
    return { command: cmd, options };
  }
}

export function spawn(...args: SpawnArgs): Subprocess {
  const { command, options } = parseSpawnArgs(args);
  if (command.length === 0) {
    throw new Error("spawn: command array cannot be empty");
  }
  const [cmd, ...cmdArgs] = command as [string, ...string[]];

  // Build stdio array
  const stdio: StdioOptions =
    options.stdio ?
      [
        mapStdioOption(options.stdio[0]),
        mapStdioOption(options.stdio[1]),
        mapStdioOption(options.stdio[2]),
      ]
    : [
        mapStdioOption(options.stdin),
        mapStdioOption(options.stdout),
        mapStdioOption(options.stderr),
      ];

  // Add IPC channel if ipc callback provided
  if (options.ipc) {
    (stdio as StdioOptions[number][]).push("ipc");
  }

  const proc = nodeSpawn(cmd, cmdArgs, {
    cwd: options.cwd,
    env: options.env as NodeJS.ProcessEnv,
    stdio,
    windowsHide: options.windowsHide,
    windowsVerbatimArguments: options.windowsVerbatimArguments,
    argv0: options.argv0,
    serialization: options.serialization,
  });

  return new SubprocessImpl(proc, options);
}

// ============================================================================
// spawnSync() Implementation
// ============================================================================

export function spawnSync(...args: SpawnArgs): SyncSubprocess {
  const { command, options } = parseSpawnArgs(args);
  if (command.length === 0) {
    throw new Error("spawnSync: command array cannot be empty");
  }
  const [cmd, ...cmdArgs] = command as [string, ...string[]];

  // Build stdio array
  const stdio: StdioOptions =
    options.stdio ?
      [
        mapStdioOption(options.stdio[0]),
        mapStdioOption(options.stdio[1]),
        mapStdioOption(options.stdio[2]),
      ]
    : [
        mapStdioOption(options.stdin),
        mapStdioOption(options.stdout),
        mapStdioOption(options.stderr),
      ];

  const result: SpawnSyncReturns<Buffer> = nodeSpawnSync(cmd, cmdArgs, {
    cwd: options.cwd,
    env: options.env as NodeJS.ProcessEnv,
    stdio,
    windowsHide: options.windowsHide,
    windowsVerbatimArguments: options.windowsVerbatimArguments,
    argv0: options.argv0,
    timeout: options.timeout,
    killSignal: options.killSignal as NodeJS.Signals,
    maxBuffer: options.maxBuffer,
    encoding: "buffer",
  });

  const exitedDueToTimeout =
    result.signal === "SIGTERM" && options.timeout !== undefined;

  return {
    stdout: result.stdout ?? undefined,
    stderr: result.stderr ?? undefined,
    exitCode: result.status ?? -1,
    success: result.status === 0,
    resourceUsage: createEmptyResourceUsage(),
    signalCode: result.signal ?? undefined,
    ...(exitedDueToTimeout ? { exitedDueToTimeout: true as const } : {}),
    pid: result.pid ?? -1,
  };
}

// ============================================================================
// Init
// ============================================================================

export function initSpawn(Bun: Partial<PolyfillBun>): void {
  if (!("spawn" in Bun)) {
    Bun.spawn = spawn;
  }
  if (!("spawnSync" in Bun)) {
    Bun.spawnSync = spawnSync;
  }
}
