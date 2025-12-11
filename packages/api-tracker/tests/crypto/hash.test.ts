import { describe, expect, test } from "bun:test";
import {
  initBunShims,
  hash as polyfillHash,
  CryptoHasher as PolyfillCryptoHasher,
  MD4,
  MD5,
  SHA1,
  SHA224,
  SHA256,
  SHA384,
  SHA512,
  SHA512_256,
} from "@kjanat/bun-polyfills";

// Initialize polyfills
await initBunShims();

// Force use of polyfills in Bun environment for testing
if (typeof Bun !== "undefined") {
  // @ts-ignore - Override native implementations
  Bun.hash = polyfillHash;
  // @ts-ignore
  Bun.CryptoHasher = PolyfillCryptoHasher;
  // @ts-ignore
  Bun.MD4 = MD4;
  // @ts-ignore
  Bun.MD5 = MD5;
  // @ts-ignore
  Bun.SHA1 = SHA1;
  // @ts-ignore
  Bun.SHA224 = SHA224;
  // @ts-ignore
  Bun.SHA256 = SHA256;
  // @ts-ignore
  Bun.SHA384 = SHA384;
  // @ts-ignore
  Bun.SHA512 = SHA512;
  // @ts-ignore
  Bun.SHA512_256 = SHA512_256;
}

describe("Bun.hash()", () => {
  test("returns bigint", () => {
    const result = Bun.hash("hello");
    expect(typeof result).toBe("bigint");
  });

  test("consistent for same input", () => {
    const h1 = Bun.hash("hello");
    const h2 = Bun.hash("hello");
    expect(h1).toBe(h2);
  });

  test("different for different inputs", () => {
    const h1 = Bun.hash("hello");
    const h2 = Bun.hash("world");
    expect(h1).not.toBe(h2);
  });

  test("accepts ArrayBuffer", () => {
    const buf = new TextEncoder().encode("hello");
    const result = Bun.hash(buf.buffer);
    expect(typeof result).toBe("bigint");
  });

  test("accepts Uint8Array", () => {
    const arr = new TextEncoder().encode("hello");
    const result = Bun.hash(arr);
    expect(typeof result).toBe("bigint");
  });

  test("accepts seed parameter", () => {
    const h1 = Bun.hash("hello", 0);
    const h2 = Bun.hash("hello", 42);
    expect(h1).not.toBe(h2);
  });

  test("accepts bigint seed", () => {
    const result = Bun.hash("hello", 123n);
    expect(typeof result).toBe("bigint");
  });
});

describe("Bun.CryptoHasher", () => {
  test("creates hasher instance", () => {
    const hasher = new Bun.CryptoHasher("sha256");
    expect(hasher).toBeDefined();
    expect(hasher.algorithm).toBe("sha256");
  });

  test("computes SHA256 correctly", () => {
    const hasher = new Bun.CryptoHasher("sha256");
    hasher.update("hello");
    const digest = hasher.digest("hex");
    expect(digest).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  test("computes MD5 correctly", () => {
    const hasher = new Bun.CryptoHasher("md5");
    hasher.update("hello");
    const digest = hasher.digest("hex");
    expect(digest).toBe("5d41402abc4b2a76b9719d911017c592");
  });

  test("computes SHA512 correctly", () => {
    const hasher = new Bun.CryptoHasher("sha512");
    hasher.update("hello");
    const digest = hasher.digest("hex");
    expect(digest).toBe(
      "9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043",
    );
  });

  test("digest returns ArrayBuffer by default", () => {
    const hasher = new Bun.CryptoHasher("sha256");
    hasher.update("hello");
    const digest = hasher.digest();
    expect(digest instanceof ArrayBuffer).toBe(true);
    expect(digest.byteLength).toBe(32);
  });

  test("digest returns base64", () => {
    const hasher = new Bun.CryptoHasher("sha256");
    hasher.update("hello");
    const digest = hasher.digest("base64");
    expect(typeof digest).toBe("string");
    expect(digest).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  test("update can be chained", () => {
    const hasher = new Bun.CryptoHasher("sha256");
    const result = hasher.update("hel").update("lo");
    expect(result).toBe(hasher);
    expect(hasher.digest("hex")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  test("multiple updates combine", () => {
    const hasher1 = new Bun.CryptoHasher("sha256");
    hasher1.update("hello");

    const hasher2 = new Bun.CryptoHasher("sha256");
    hasher2.update("hel");
    hasher2.update("lo");

    expect(hasher1.digest("hex")).toBe(hasher2.digest("hex"));
  });

  test("throws on consumed hasher", () => {
    const hasher = new Bun.CryptoHasher("sha256");
    hasher.update("hello");
    hasher.digest();
    expect(() => hasher.update("world")).toThrow(/consumed/);
  });

  test("byteLength property", () => {
    const sha256 = new Bun.CryptoHasher("sha256");
    expect(sha256.byteLength).toBe(32);

    const md5 = new Bun.CryptoHasher("md5");
    expect(md5.byteLength).toBe(16);

    const sha512 = new Bun.CryptoHasher("sha512");
    expect(sha512.byteLength).toBe(64);
  });

  test("accepts string input", () => {
    const hasher = new Bun.CryptoHasher("sha256");
    hasher.update("hello");
    expect(hasher.digest("hex")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  test("accepts ArrayBuffer input", () => {
    const buf = new TextEncoder().encode("hello").buffer;
    const hasher = new Bun.CryptoHasher("sha256");
    hasher.update(buf);
    expect(hasher.digest("hex")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  test("accepts Uint8Array input", () => {
    const arr = new TextEncoder().encode("hello");
    const hasher = new Bun.CryptoHasher("sha256");
    hasher.update(arr);
    expect(hasher.digest("hex")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });
});

describe("Hash shortcuts", () => {
  test("Bun.MD5", () => {
    const hasher = new Bun.MD5();
    hasher.update("hello");
    expect(hasher.digest("hex")).toBe("5d41402abc4b2a76b9719d911017c592");
  });

  test("Bun.SHA1", () => {
    const hasher = new Bun.SHA1();
    hasher.update("hello");
    expect(hasher.digest("hex")).toBe(
      "aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d",
    );
  });

  test("Bun.SHA256", () => {
    const hasher = new Bun.SHA256();
    hasher.update("hello");
    expect(hasher.digest("hex")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  test("Bun.SHA512", () => {
    const hasher = new Bun.SHA512();
    hasher.update("hello");
    expect(hasher.digest("hex")).toBe(
      "9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043",
    );
  });
});
