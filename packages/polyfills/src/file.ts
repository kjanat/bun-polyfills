// Bun.file(), Bun.write(), Bun.stdin/stdout/stderr polyfills using node:fs
//
// LIMITATIONS:
// - size property uses sync fs.statSync() (cached after first access)
// - stdin/stdout/stderr size always returns 0
// - slice() creates new BunFile but reads full file then slices (no streaming slice)
// - MIME type inference is basic extension-based (no content sniffing)
// - FileSink.start() options ignored after construction
// - SharedArrayBuffer writes converted to regular ArrayBuffer
// - No copy_file_range/sendfile optimizations (uses standard Node.js fs)

import * as fs from "node:fs";
import * as fsPromises from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";

import type {
  PolyfillBun,
  PolyfillBunFile,
  PolyfillFileSink,
} from "./types.ts";

// ============================================================================
// MIME Type Inference
// ============================================================================

const MIME_TYPES: Record<string, string> = {
  ".txt": "text/plain;charset=utf-8",
  ".json": "application/json;charset=utf-8",
  ".js": "text/javascript;charset=utf-8",
  ".mjs": "text/javascript;charset=utf-8",
  ".cjs": "text/javascript;charset=utf-8",
  ".ts": "text/typescript;charset=utf-8",
  ".mts": "text/typescript;charset=utf-8",
  ".cts": "text/typescript;charset=utf-8",
  ".tsx": "text/typescript;charset=utf-8",
  ".jsx": "text/javascript;charset=utf-8",
  ".html": "text/html;charset=utf-8",
  ".htm": "text/html;charset=utf-8",
  ".css": "text/css;charset=utf-8",
  ".xml": "application/xml;charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".gz": "application/gzip",
  ".tar": "application/x-tar",
  ".wasm": "application/wasm",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".eot": "application/vnd.ms-fontobject",
  ".md": "text/markdown;charset=utf-8",
  ".yaml": "text/yaml;charset=utf-8",
  ".yml": "text/yaml;charset=utf-8",
  ".toml": "text/toml;charset=utf-8",
  ".sh": "application/x-sh",
  ".bat": "application/x-msdos-program",
  ".exe": "application/x-msdownload",
};

function inferMimeType(filePath: string | null): string {
  if (!filePath) return "application/octet-stream";
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] ?? "text/plain;charset=utf-8";
}

// ============================================================================
// FileSink Implementation
// ============================================================================

class FileSinkImpl implements PolyfillFileSink {
  private buffer: Buffer[] = [];
  private bufferSize = 0;
  private fd: number | null = null;
  private highWaterMark: number;
  private bytesWritten = 0;
  private _referenced = true;
  private closed = false;
  private readonly pathOrFd: string | number;

  constructor(pathOrFd: string | number, params?: { highWaterMark?: number }) {
    this.pathOrFd = pathOrFd;
    this.highWaterMark = params?.highWaterMark ?? 16 * 1024; // 16KB default
  }

  private ensureOpen(): void {
    if (this.closed) {
      throw new Error("FileSink is closed");
    }
    if (this.fd === null) {
      if (typeof this.pathOrFd === "number") {
        this.fd = this.pathOrFd;
      } else {
        this.fd = fs.openSync(this.pathOrFd, "w");
      }
    }
  }

  write(
    chunk: string | ArrayBufferView | ArrayBuffer | SharedArrayBuffer,
  ): number {
    this.ensureOpen();

    let data: Buffer;
    if (typeof chunk === "string") {
      data = Buffer.from(chunk);
    } else if (
      chunk instanceof ArrayBuffer ||
      chunk instanceof SharedArrayBuffer
    ) {
      data = Buffer.from(new Uint8Array(chunk));
    } else {
      // ArrayBufferView (Uint8Array, etc.)
      data = Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    }

    this.buffer.push(data);
    this.bufferSize += data.length;

    // Auto-flush at high water mark
    if (this.bufferSize >= this.highWaterMark) {
      this.flush();
    }

    return data.length;
  }

  flush(): number {
    if (this.bufferSize === 0) return 0;
    this.ensureOpen();

    const toWrite = Buffer.concat(this.buffer);
    fs.writeSync(this.fd!, toWrite);
    const flushed = this.bufferSize;
    this.bytesWritten += flushed;
    this.buffer = [];
    this.bufferSize = 0;
    return flushed;
  }

  end(error?: Error): number | Promise<number> {
    if (this.closed) return this.bytesWritten;

    this.flush();
    this.closed = true;

    if (this.fd !== null && typeof this.pathOrFd !== "number") {
      // Only close if we opened it (not for passed fd)
      fs.closeSync(this.fd);
    }

    if (error) {
      throw error;
    }

    return this.bytesWritten;
  }

  start(_options?: { highWaterMark?: number }): void {
    // Options ignored after construction (limitation)
  }

  ref(): void {
    this._referenced = true;
  }

  unref(): void {
    this._referenced = false;
  }
}

// ============================================================================
// BunFile Factory
// ============================================================================

function createBunFile(
  pathOrFd: string | number | URL,
  options?: { type?: string },
): PolyfillBunFile {
  // Resolve path
  let filePath: string | null = null;
  let fd: number | null = null;

  if (typeof pathOrFd === "number") {
    fd = pathOrFd;
  } else if (pathOrFd instanceof URL) {
    filePath = fileURLToPath(pathOrFd);
  } else {
    filePath = pathOrFd;
  }

  // Lazy cached size
  let _size: number | null = null;

  // MIME type
  const mimeType = options?.type
    ? `${options.type};charset=utf-8`
    : inferMimeType(filePath);

  const bunFile: PolyfillBunFile = {
    get size(): number {
      if (_size !== null) return _size;
      try {
        const stat = fd !== null ? fs.fstatSync(fd) : fs.statSync(filePath!);
        _size = stat.size;
      } catch {
        _size = 0; // non-existent file
      }
      return _size;
    },

    get type(): string {
      return mimeType;
    },

    get name(): string | undefined {
      return filePath ?? undefined;
    },

    async text(): Promise<string> {
      if (fd !== null) {
        const buffer = Buffer.alloc(fs.fstatSync(fd).size);
        fs.readSync(fd, buffer, 0, buffer.length, 0);
        return buffer.toString("utf-8");
      }
      return fsPromises.readFile(filePath!, "utf-8");
    },

    async arrayBuffer(): Promise<ArrayBuffer> {
      let data: Buffer;
      if (fd !== null) {
        data = Buffer.alloc(fs.fstatSync(fd).size);
        fs.readSync(fd, data, 0, data.length, 0);
      } else {
        data = await fsPromises.readFile(filePath!);
      }
      return data.buffer.slice(
        data.byteOffset,
        data.byteOffset + data.byteLength,
      ) as ArrayBuffer;
    },

    async bytes(): Promise<Uint8Array> {
      let data: Buffer;
      if (fd !== null) {
        data = Buffer.alloc(fs.fstatSync(fd).size);
        fs.readSync(fd, data, 0, data.length, 0);
      } else {
        data = await fsPromises.readFile(filePath!);
      }
      return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    },

    async json<T = unknown>(): Promise<T> {
      const text = await bunFile.text();
      return JSON.parse(text) as T;
    },

    stream(): ReadableStream<Uint8Array> {
      let nodeStream: fs.ReadStream;
      if (fd !== null) {
        nodeStream = fs.createReadStream("", { fd, autoClose: false });
      } else {
        nodeStream = fs.createReadStream(filePath!);
      }
      return Readable.toWeb(
        nodeStream,
      ) as unknown as ReadableStream<Uint8Array>;
    },

    slice(begin?: number, end?: number, contentType?: string): PolyfillBunFile {
      // Create a new BunFile that reads a slice
      // Limitation: still reads full file, then slices
      const slicedFile: PolyfillBunFile = {
        get size(): number {
          const fullSize = bunFile.size;
          const start = begin ?? 0;
          const stop = end ?? fullSize;
          return Math.max(0, stop - start);
        },

        get type(): string {
          return contentType ?? mimeType;
        },

        get name(): string | undefined {
          return filePath ?? undefined;
        },

        async text(): Promise<string> {
          const full = await bunFile.text();
          return full.slice(begin, end);
        },

        async arrayBuffer(): Promise<ArrayBuffer> {
          const full = await bunFile.arrayBuffer();
          return full.slice(begin ?? 0, end ?? full.byteLength);
        },

        async bytes(): Promise<Uint8Array> {
          const full = await bunFile.bytes();
          return full.slice(begin, end);
        },

        stream(): ReadableStream<Uint8Array> {
          // For sliced stream, read with start/end options
          let nodeStream: fs.ReadStream;
          if (fd !== null) {
            nodeStream = fs.createReadStream("", {
              fd,
              autoClose: false,
              start: begin,
              end: end !== undefined ? end - 1 : undefined,
            });
          } else {
            nodeStream = fs.createReadStream(filePath!, {
              start: begin,
              end: end !== undefined ? end - 1 : undefined,
            });
          }
          return Readable.toWeb(
            nodeStream,
          ) as unknown as ReadableStream<Uint8Array>;
        },

        async json<T = unknown>(): Promise<T> {
          const text = await slicedFile.text();
          return JSON.parse(text) as T;
        },

        slice(b?: number, e?: number, ct?: string): PolyfillBunFile {
          const newBegin = (begin ?? 0) + (b ?? 0);
          const newEnd = e !== undefined ? (begin ?? 0) + e : end;
          return bunFile.slice(newBegin, newEnd, ct ?? contentType);
        },

        async exists(): Promise<boolean> {
          return bunFile.exists();
        },

        writer(_params?: { highWaterMark?: number }): PolyfillFileSink {
          throw new Error("Cannot create writer for sliced file");
        },

        async delete(): Promise<void> {
          return bunFile.delete();
        },
      };
      return slicedFile;
    },

    async exists(): Promise<boolean> {
      if (fd !== null) return true; // fd exists if we have it
      try {
        await fsPromises.access(filePath!);
        return true;
      } catch {
        return false;
      }
    },

    writer(params?: { highWaterMark?: number }): PolyfillFileSink {
      if (fd !== null) {
        return new FileSinkImpl(fd, params);
      }
      return new FileSinkImpl(filePath!, params);
    },

    async delete(): Promise<void> {
      if (fd !== null) {
        throw new Error("Cannot delete file opened by fd");
      }
      await fsPromises.unlink(filePath!);
    },
  };

  return bunFile;
}

// ============================================================================
// Stdio BunFile (stdin/stdout/stderr)
// ============================================================================

function createStdioBunFile(
  fd: 0 | 1 | 2,
  name: "stdin" | "stdout" | "stderr",
): PolyfillBunFile {
  const isReadable = fd === 0;

  return {
    get size(): number {
      return 0; // stdio has no size
    },

    get type(): string {
      return "application/octet-stream";
    },

    get name(): string | undefined {
      return name;
    },

    async text(): Promise<string> {
      if (!isReadable) {
        throw new Error(`Cannot read from ${name}`);
      }
      return new Promise((resolve, reject) => {
        let data = "";
        process.stdin.setEncoding("utf-8");
        process.stdin.on("data", (chunk) => {
          data += chunk;
        });
        process.stdin.on("end", () => resolve(data));
        process.stdin.on("error", reject);
      });
    },

    async arrayBuffer(): Promise<ArrayBuffer> {
      if (!isReadable) {
        throw new Error(`Cannot read from ${name}`);
      }
      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        process.stdin.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });
        process.stdin.on("end", () => {
          const buffer = Buffer.concat(chunks);
          resolve(
            buffer.buffer.slice(
              buffer.byteOffset,
              buffer.byteOffset + buffer.byteLength,
            ),
          );
        });
        process.stdin.on("error", reject);
      });
    },

    async bytes(): Promise<Uint8Array> {
      const ab = await this.arrayBuffer();
      return new Uint8Array(ab);
    },

    stream(): ReadableStream<Uint8Array> {
      if (!isReadable) {
        throw new Error(`Cannot read stream from ${name}`);
      }
      return Readable.toWeb(
        process.stdin,
      ) as unknown as ReadableStream<Uint8Array>;
    },

    async json<T = unknown>(): Promise<T> {
      const text = await this.text();
      return JSON.parse(text) as T;
    },

    slice(): PolyfillBunFile {
      throw new Error(`Cannot slice ${name}`);
    },

    async exists(): Promise<boolean> {
      return true;
    },

    writer(params?: { highWaterMark?: number }): PolyfillFileSink {
      if (isReadable) {
        throw new Error("Cannot write to stdin");
      }
      return new FileSinkImpl(fd, params);
    },

    async delete(): Promise<void> {
      throw new Error(`Cannot delete ${name}`);
    },
  };
}

// ============================================================================
// Bun.write() Implementation
// ============================================================================

async function bunWrite(
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
): Promise<number> {
  // Resolve destination
  let destPath: string | null = null;
  let destFd: number | null = null;

  if (typeof destination === "number") {
    destFd = destination;
  } else if (typeof destination === "string") {
    destPath = destination;
  } else if (destination instanceof URL) {
    destPath = fileURLToPath(destination);
  } else if ("text" in destination) {
    // BunFile - need to get its path somehow
    // Limitation: we can't get the path from a BunFile, throw error
    throw new Error(
      "Bun.write polyfill: BunFile destination requires path extraction (not supported)",
    );
  }

  // Resolve data to write
  let content: Buffer;

  if (typeof data === "string") {
    content = Buffer.from(data);
  } else if (data instanceof Uint8Array) {
    content = Buffer.from(data);
  } else if (data instanceof ArrayBuffer || data instanceof SharedArrayBuffer) {
    content = Buffer.from(new Uint8Array(data));
  } else if (data instanceof Blob) {
    const ab = await data.arrayBuffer();
    content = Buffer.from(new Uint8Array(ab));
  } else if (data instanceof ReadableStream) {
    const reader = data.getReader();
    const chunks: Uint8Array[] = [];
    let done = false;
    while (!done) {
      const result = await reader.read();
      done = result.done;
      if (result.value) chunks.push(result.value);
    }
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    content = Buffer.from(combined);
  } else if (data instanceof Response) {
    const ab = await data.arrayBuffer();
    content = Buffer.from(new Uint8Array(ab));
  } else if (typeof data === "object" && "text" in data) {
    // BunFile-like object
    const text = await (data as PolyfillBunFile).text();
    content = Buffer.from(text);
  } else {
    throw new Error("Bun.write polyfill: unsupported data type");
  }

  // Write
  if (destFd !== null) {
    fs.writeSync(destFd, content);
  } else if (destPath !== null) {
    await fsPromises.writeFile(destPath, content);
  } else {
    throw new Error("Bun.write polyfill: could not resolve destination");
  }

  return content.length;
}

// ============================================================================
// Init
// ============================================================================

export function initFile(bun: Partial<PolyfillBun>): void {
  // Bun.file()
  if (!("file" in bun)) {
    bun.file = createBunFile;
  }

  // Bun.write()
  if (!("write" in bun)) {
    bun.write = bunWrite;
  }

  // Bun.stdin/stdout/stderr
  if (!("stdin" in bun)) {
    bun.stdin = createStdioBunFile(0, "stdin");
  }
  if (!("stdout" in bun)) {
    bun.stdout = createStdioBunFile(1, "stdout");
  }
  if (!("stderr" in bun)) {
    bun.stderr = createStdioBunFile(2, "stderr");
  }
}
