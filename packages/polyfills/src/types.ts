// Type definitions for Bun polyfills

// ============================================================================
// FileSink
// ============================================================================

export interface PolyfillFileSink {
  write(
    chunk: string | ArrayBufferView | ArrayBuffer | SharedArrayBuffer,
  ): number;
  flush(): number | Promise<number>;
  end(error?: Error): number | Promise<number>;
  start(options?: { highWaterMark?: number }): void;
  ref(): void;
  unref(): void;
}

// ============================================================================
// BunFile
// ============================================================================

export interface PolyfillBunFile {
  readonly size: number;
  readonly type: string;
  readonly name: string | undefined;
  arrayBuffer(): Promise<ArrayBuffer>;
  bytes(): Promise<Uint8Array>;
  text(): Promise<string>;
  stream(): ReadableStream<Uint8Array>;
  json<T = unknown>(): Promise<T>;
  slice(begin?: number, end?: number, contentType?: string): PolyfillBunFile;
  exists(): Promise<boolean>;
  writer(params?: { highWaterMark?: number }): PolyfillFileSink;
  delete(): Promise<void>;
}

// ============================================================================
// Shell
// ============================================================================

export interface ShellOutput {
  readonly stdout: Buffer;
  readonly stderr: Buffer;
  readonly exitCode: number;
  text(encoding?: BufferEncoding): string;
  json<T = unknown>(): T;
  arrayBuffer(): ArrayBuffer;
  blob(): Blob;
  bytes(): Uint8Array;
}

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

export type ShellFunction = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => ShellPromise;

// ============================================================================
// Spawn
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
// Bun Global
// ============================================================================

export interface PolyfillBun {
  env: NodeJS.ProcessEnv;
  stdin: PolyfillBunFile;
  stdout: PolyfillBunFile;
  stderr: PolyfillBunFile;
  file: (
    path: string | number | URL,
    options?: { type?: string },
  ) => PolyfillBunFile;
  write: (
    destination: string | number | PolyfillBunFile | URL,
    data:
      | string
      | Blob
      | Uint8Array
      | ArrayBuffer
      | SharedArrayBuffer
      | ReadableStream
      | PolyfillBunFile
      | Response,
  ) => Promise<number>;
  $: ShellFunction;
  spawn: {
    (command: string[], options?: SpawnOptionsObject): Subprocess;
    (options: { cmd: string[] } & SpawnOptionsObject): Subprocess;
  };
  spawnSync: {
    (command: string[], options?: SpawnOptionsObject): SyncSubprocess;
    (options: { cmd: string[] } & SpawnOptionsObject): SyncSubprocess;
  };
  version: string;
  revision: string;
}
