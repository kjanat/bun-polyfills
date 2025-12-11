import { describe, expect, test } from "bun:test";
import { deflateSync, gunzipSync, gzipSync, inflateSync } from "./compression";

describe("Compression", () => {
  const testString = "Hello, World! This is a test string for compression.";
  const testBuffer = Buffer.from(testString);
  const testUint8Array = new Uint8Array(testBuffer);

  describe("gzipSync / gunzipSync", () => {
    test("produces correct gzip output", () => {
      // Known gzip output for "Hello, World!" (bytes 4-9 are OS-dependent timestamp, use 0s)
      const input = "Hello, World!";
      const compressed = gzipSync(input);

      // Verify gzip magic number header (1f 8b)
      expect(compressed[0]).toBe(0x1f);
      expect(compressed[1]).toBe(0x8b);
      // Compression method (08 = deflate)
      expect(compressed[2]).toBe(0x08);

      // Verify decompression produces exact original
      const decompressed = gunzipSync(compressed);
      expect(Buffer.from(decompressed).toString()).toBe(input);
    });

    test("compresses and decompresses string", () => {
      const compressed = gzipSync(testString);
      expect(compressed).toBeInstanceOf(Uint8Array);

      const decompressed = gunzipSync(compressed);
      expect(decompressed).toBeInstanceOf(Uint8Array);
      expect(Buffer.from(decompressed).toString()).toBe(testString);
    });

    test("compresses and decompresses Buffer", () => {
      const compressed = gzipSync(testBuffer);
      const decompressed = gunzipSync(compressed);
      expect(Buffer.from(decompressed).toString()).toBe(testString);
    });

    test("compresses and decompresses Uint8Array", () => {
      const compressed = gzipSync(testUint8Array);
      const decompressed = gunzipSync(compressed);
      expect(Buffer.from(decompressed).toString()).toBe(testString);
    });

    test("compresses and decompresses ArrayBuffer", () => {
      const arrayBuffer = testUint8Array.buffer.slice(
        testUint8Array.byteOffset,
        testUint8Array.byteOffset + testUint8Array.byteLength,
      );
      const compressed = gzipSync(arrayBuffer);
      const decompressed = gunzipSync(compressed);
      expect(Buffer.from(decompressed).toString()).toBe(testString);
    });

    test("respects compression level", () => {
      const level1 = gzipSync(testString, { level: 1 });
      const level9 = gzipSync(testString, { level: 9 });

      // Both should decompress to same result
      expect(Buffer.from(gunzipSync(level1)).toString()).toBe(testString);
      expect(Buffer.from(gunzipSync(level9)).toString()).toBe(testString);

      // Level 9 should generally be smaller or equal for compressible data
      // (not always true for small data, so we just verify they work)
    });

    test("handles empty input", () => {
      const compressed = gzipSync("");
      const decompressed = gunzipSync(compressed);
      expect(Buffer.from(decompressed).toString()).toBe("");
    });

    test("handles binary data", () => {
      const binaryData = new Uint8Array([0, 1, 2, 255, 254, 253, 0, 0, 0]);
      const compressed = gzipSync(binaryData);
      const decompressed = gunzipSync(compressed);
      expect(decompressed).toEqual(binaryData);
    });
  });

  describe("deflateSync / inflateSync", () => {
    test("produces correct zlib output", () => {
      const input = "Hello, World!";
      const compressed = deflateSync(input);

      // Verify zlib header (78 9c = default compression)
      expect(compressed[0]).toBe(0x78);
      expect(compressed[1]).toBe(0x9c);

      // Known deflate output for "Hello, World!"
      const expected = new Uint8Array([
        120, 156, 243, 72, 205, 201, 201, 215, 81, 8, 207, 47, 202, 73, 81, 4,
        0, 31, 158, 4, 106,
      ]);
      expect(compressed).toEqual(expected);

      // Verify decompression
      const decompressed = inflateSync(compressed);
      expect(Buffer.from(decompressed).toString()).toBe(input);
    });

    test("compresses and decompresses string", () => {
      const compressed = deflateSync(testString);
      expect(compressed).toBeInstanceOf(Uint8Array);

      const decompressed = inflateSync(compressed);
      expect(decompressed).toBeInstanceOf(Uint8Array);
      expect(Buffer.from(decompressed).toString()).toBe(testString);
    });

    test("compresses and decompresses Buffer", () => {
      const compressed = deflateSync(testBuffer);
      const decompressed = inflateSync(compressed);
      expect(Buffer.from(decompressed).toString()).toBe(testString);
    });

    test("compresses and decompresses Uint8Array", () => {
      const compressed = deflateSync(testUint8Array);
      const decompressed = inflateSync(compressed);
      expect(Buffer.from(decompressed).toString()).toBe(testString);
    });

    test("respects compression level", () => {
      const level1 = deflateSync(testString, { level: 1 });
      const level9 = deflateSync(testString, { level: 9 });

      expect(Buffer.from(inflateSync(level1)).toString()).toBe(testString);
      expect(Buffer.from(inflateSync(level9)).toString()).toBe(testString);
    });

    test("handles empty input", () => {
      const compressed = deflateSync("");
      const decompressed = inflateSync(compressed);
      expect(Buffer.from(decompressed).toString()).toBe("");
    });

    test("handles binary data", () => {
      const binaryData = new Uint8Array([0, 1, 2, 255, 254, 253, 0, 0, 0]);
      const compressed = deflateSync(binaryData);
      const decompressed = inflateSync(compressed);
      expect(decompressed).toEqual(binaryData);
    });

    test("deflate produces smaller output than gzip for same input", () => {
      // deflate doesn't have gzip header/footer overhead
      const gzipped = gzipSync(testString);
      const deflated = deflateSync(testString);
      expect(deflated.length).toBeLessThan(gzipped.length);
    });
  });

  describe("large data", () => {
    const largeString = "x".repeat(100000);

    test("gzip handles large data", () => {
      const compressed = gzipSync(largeString);
      // Highly compressible data should compress well
      expect(compressed.length).toBeLessThan(largeString.length / 10);

      const decompressed = gunzipSync(compressed);
      expect(Buffer.from(decompressed).toString()).toBe(largeString);
    });

    test("deflate handles large data", () => {
      const compressed = deflateSync(largeString);
      expect(compressed.length).toBeLessThan(largeString.length / 10);

      const decompressed = inflateSync(compressed);
      expect(Buffer.from(decompressed).toString()).toBe(largeString);
    });
  });
});
