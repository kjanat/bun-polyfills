// Compression polyfills: Bun.gzipSync, Bun.gunzipSync, Bun.deflateSync, Bun.inflateSync
// Uses node:zlib which is available in Node.js

import {
  gzipSync as nodeGzipSync,
  gunzipSync as nodeGunzipSync,
  deflateSync as nodeDeflateSync,
  inflateSync as nodeInflateSync,
  type ZlibOptions,
} from "node:zlib";

import type { PolyfillBun } from "./types.ts";

// Bun's compression options interface
export interface BunCompressionOptions {
  /**
   * Compression level (0-9)
   * 0 = no compression, 1 = fastest, 9 = best compression
   * Default varies by method
   */
  level?: number;
  /**
   * Memory level (1-9)
   * Higher = more memory, better compression
   */
  memLevel?: number;
  /**
   * Window bits (8-15 for deflate/inflate, 9-15 for gzip)
   */
  windowBits?: number;
  /**
   * Compression strategy
   */
  strategy?: number;
}

/**
 * Normalize input to Buffer for zlib functions
 */
function toBuffer(
  input: ArrayBuffer | ArrayBufferView | Uint8Array | string,
): Buffer {
  if (typeof input === "string") {
    return Buffer.from(input, "utf-8");
  }
  if (input instanceof ArrayBuffer) {
    return Buffer.from(input);
  }
  if (ArrayBuffer.isView(input)) {
    return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  }
  return Buffer.from(input);
}

/**
 * Convert Bun options to Node.js zlib options
 */
function toZlibOptions(options?: BunCompressionOptions): ZlibOptions {
  if (!options) return {};
  return {
    level: options.level,
    memLevel: options.memLevel,
    windowBits: options.windowBits,
    strategy: options.strategy,
  };
}

/**
 * Compress data using gzip synchronously
 * @param input - Data to compress
 * @param options - Compression options
 * @returns Compressed data as Uint8Array
 */
export function gzipSync(
  input: ArrayBuffer | ArrayBufferView | Uint8Array | string,
  options?: BunCompressionOptions,
): Uint8Array {
  const buffer = toBuffer(input);
  const result = nodeGzipSync(buffer, toZlibOptions(options));
  return new Uint8Array(result.buffer, result.byteOffset, result.byteLength);
}

/**
 * Decompress gzip data synchronously
 * @param input - Compressed data
 * @param options - Decompression options
 * @returns Decompressed data as Uint8Array
 */
export function gunzipSync(
  input: ArrayBuffer | ArrayBufferView | Uint8Array,
  options?: BunCompressionOptions,
): Uint8Array {
  const buffer = toBuffer(input);
  const result = nodeGunzipSync(buffer, toZlibOptions(options));
  return new Uint8Array(result.buffer, result.byteOffset, result.byteLength);
}

/**
 * Compress data using deflate synchronously
 * @param input - Data to compress
 * @param options - Compression options
 * @returns Compressed data as Uint8Array
 */
export function deflateSync(
  input: ArrayBuffer | ArrayBufferView | Uint8Array | string,
  options?: BunCompressionOptions,
): Uint8Array {
  const buffer = toBuffer(input);
  const result = nodeDeflateSync(buffer, toZlibOptions(options));
  return new Uint8Array(result.buffer, result.byteOffset, result.byteLength);
}

/**
 * Decompress deflate data synchronously
 * @param input - Compressed data
 * @param options - Decompression options
 * @returns Decompressed data as Uint8Array
 */
export function inflateSync(
  input: ArrayBuffer | ArrayBufferView | Uint8Array,
  options?: BunCompressionOptions,
): Uint8Array {
  const buffer = toBuffer(input);
  const result = nodeInflateSync(buffer, toZlibOptions(options));
  return new Uint8Array(result.buffer, result.byteOffset, result.byteLength);
}

/**
 * Initialize compression polyfills on the Bun object
 */
export function initCompression(bun: PolyfillBun): void {
  bun.gzipSync = gzipSync;
  bun.gunzipSync = gunzipSync;
  bun.deflateSync = deflateSync;
  bun.inflateSync = inflateSync;
}
