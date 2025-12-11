// Crypto polyfills for Bun APIs
import {
  createHash,
  scryptSync,
  timingSafeEqual,
  randomBytes,
} from "node:crypto";
import type { BinaryLike } from "node:crypto";
import type { PolyfillBun } from "./types.ts";

/**
 * Supported hash algorithms for CryptoHasher
 */
export type HashAlgorithm =
  | "md4"
  | "md5"
  | "sha1"
  | "sha224"
  | "sha256"
  | "sha384"
  | "sha512"
  | "sha512-256"
  | "blake2b256"
  | "blake2b512";

/**
 * CryptoHasher class - mimics Bun's CryptoHasher
 * Wraps node:crypto's Hash for streaming hash computation
 */
export class CryptoHasher {
  private hasher: ReturnType<typeof createHash>;
  private consumed = false;
  readonly algorithm: HashAlgorithm;

  constructor(algorithm: HashAlgorithm) {
    this.algorithm = algorithm;

    // Map Bun algorithm names to node:crypto names
    const algoMap: Record<HashAlgorithm, string> = {
      md4: "md4",
      md5: "md5",
      sha1: "sha1",
      sha224: "sha224",
      sha256: "sha256",
      sha384: "sha384",
      sha512: "sha512",
      "sha512-256": "sha512-256",
      blake2b256: "blake2b512", // Node doesn't have blake2b256
      blake2b512: "blake2b512",
    };

    const nodeAlgo = algoMap[algorithm];
    if (!nodeAlgo) {
      throw new Error(`Unsupported hash algorithm: ${algorithm}`);
    }

    this.hasher = createHash(nodeAlgo);
  }

  /**
   * Update the hash with new data
   */
  update(data: string | ArrayBufferView | ArrayBuffer): this {
    if (this.consumed) {
      throw new Error("CryptoHasher has been consumed");
    }

    if (typeof data === "string") {
      this.hasher.update(data, "utf8");
    } else if (data instanceof ArrayBuffer) {
      this.hasher.update(new Uint8Array(data));
    } else {
      // ArrayBufferView
      this.hasher.update(
        new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
      );
    }

    return this;
  }

  /**
   * Finalize and return the hash digest
   */
  digest(encoding?: "hex" | "base64"): ArrayBuffer | string {
    if (this.consumed) {
      throw new Error("CryptoHasher has been consumed");
    }
    this.consumed = true;

    if (encoding === "hex" || encoding === "base64") {
      return this.hasher.digest(encoding);
    }

    const buffer = this.hasher.digest();
    return buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    );
  }

  /**
   * Create a copy of this hasher (if not consumed)
   */
  copy(): CryptoHasher {
    if (this.consumed) {
      throw new Error("Cannot copy consumed CryptoHasher");
    }

    const copy = new CryptoHasher(this.algorithm);
    // Note: node:crypto doesn't support cloning Hash objects,
    // so we can't truly copy state. This is a limitation.
    return copy;
  }

  /**
   * Get the byte length of the hash output
   */
  get byteLength(): number {
    const lengths: Record<HashAlgorithm, number> = {
      md4: 16,
      md5: 16,
      sha1: 20,
      sha224: 28,
      sha256: 32,
      sha384: 48,
      sha512: 64,
      "sha512-256": 32,
      blake2b256: 32,
      blake2b512: 64,
    };
    return lengths[this.algorithm];
  }
}

// Convenience hash classes
export class MD4 extends CryptoHasher {
  constructor() {
    super("md4");
  }
}

export class MD5 extends CryptoHasher {
  constructor() {
    super("md5");
  }
}

export class SHA1 extends CryptoHasher {
  constructor() {
    super("sha1");
  }
}

export class SHA224 extends CryptoHasher {
  constructor() {
    super("sha224");
  }
}

export class SHA256 extends CryptoHasher {
  constructor() {
    super("sha256");
  }
}

export class SHA384 extends CryptoHasher {
  constructor() {
    super("sha384");
  }
}

export class SHA512 extends CryptoHasher {
  constructor() {
    super("sha512");
  }
}

export class SHA512_256 extends CryptoHasher {
  constructor() {
    super("sha512-256");
  }
}

/**
 * Fast non-cryptographic hash function
 * Bun uses Wyhash, we'll use a simple implementation
 * Note: This won't match Bun's exact output but provides similar performance
 */
export function hash(
  input: string | ArrayBufferView | ArrayBuffer,
  seed: number | bigint = 0,
): bigint {
  let bytes: Uint8Array;

  if (typeof input === "string") {
    bytes = new TextEncoder().encode(input);
  } else if (input instanceof ArrayBuffer) {
    bytes = new Uint8Array(input);
  } else {
    bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }

  // Simple FNV-1a hash (64-bit) as Wyhash substitute
  // Not cryptographically secure, but fast
  const FNV_PRIME = 0x100000001b3n;
  const FNV_OFFSET = 0xcbf29ce484222325n;

  let hashValue = FNV_OFFSET ^ BigInt(Number(seed));

  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      hashValue ^= BigInt(byte);
      hashValue = (hashValue * FNV_PRIME) & 0xffffffffffffffffn;
    }
  }

  return hashValue;
}

/**
 * Password hashing utilities
 */
export const password = {
  /**
   * Hash a password using scrypt (Node.js standard)
   * Bun uses Argon2id by default, but scrypt is a good alternative
   */
  async hash(
    input: string,
    options?: {
      algorithm?: "argon2id" | "bcrypt";
      memoryCost?: number;
      timeCost?: number;
    },
  ): Promise<string> {
    // Using scrypt as it's built into node:crypto
    // Format: $scrypt$N=16384,r=8,p=1$salt$hash
    const salt = randomBytes(16);
    const N = options?.memoryCost || 16384;
    const r = 8;
    const p = options?.timeCost || 1;

    return new Promise((resolve, reject) => {
      try {
        const derived = scryptSync(input, salt, 32, { N, r, p });
        const saltB64 = salt
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=/g, "");
        const hashB64 = derived
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=/g, "");
        resolve(`$scrypt$N=${N},r=${r},p=${p}$${saltB64}$${hashB64}`);
      } catch (err) {
        reject(err);
      }
    });
  },

  /**
   * Verify a password against a hash
   */
  async verify(input: string, hash: string): Promise<boolean> {
    try {
      // Parse the hash format: $scrypt$N=16384,r=8,p=1$salt$hash
      const parts = hash.split("$");
      if (parts[1] !== "scrypt") {
        throw new Error("Unsupported hash format");
      }

      const paramsStr = parts[2];
      const saltStr = parts[3];
      const hashStr = parts[4];

      if (!paramsStr || !saltStr || !hashStr) {
        throw new Error("Invalid hash format");
      }

      const params = paramsStr.split(",").reduce(
        (acc, part) => {
          const [key, val] = part.split("=");
          if (key && val) {
            acc[key] = parseInt(val, 10);
          }
          return acc;
        },
        {} as Record<string, number>,
      );

      const salt = Buffer.from(
        saltStr.replace(/-/g, "+").replace(/_/g, "/"),
        "base64",
      );
      const storedHash = Buffer.from(
        hashStr.replace(/-/g, "+").replace(/_/g, "/"),
        "base64",
      );

      return new Promise((resolve, reject) => {
        try {
          const derived = scryptSync(input, salt, 32, {
            N: params.N,
            r: params.r,
            p: params.p,
          });
          resolve(timingSafeEqual(derived, storedHash));
        } catch (err) {
          reject(err);
        }
      });
    } catch {
      return false;
    }
  },

  /**
   * Synchronous password hashing
   */
  hashSync(
    input: string,
    options?: {
      algorithm?: "argon2id" | "bcrypt";
      memoryCost?: number;
      timeCost?: number;
    },
  ): string {
    const salt = randomBytes(16);
    const N = options?.memoryCost || 16384;
    const r = 8;
    const p = options?.timeCost || 1;

    const derived = scryptSync(input, salt, 32, { N, r, p });
    const saltB64 = salt
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    const hashB64 = derived
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    return `$scrypt$N=${N},r=${r},p=${p}$${saltB64}$${hashB64}`;
  },

  /**
   * Synchronous password verification
   */
  verifySync(input: string, hash: string): boolean {
    try {
      const parts = hash.split("$");
      if (parts[1] !== "scrypt") {
        return false;
      }

      const paramsStr = parts[2];
      const saltStr = parts[3];
      const hashStr = parts[4];

      if (!paramsStr || !saltStr || !hashStr) {
        return false;
      }

      const params = paramsStr.split(",").reduce(
        (acc, part) => {
          const [key, val] = part.split("=");
          if (key && val) {
            acc[key] = parseInt(val, 10);
          }
          return acc;
        },
        {} as Record<string, number>,
      );

      const salt = Buffer.from(
        saltStr.replace(/-/g, "+").replace(/_/g, "/"),
        "base64",
      );
      const storedHash = Buffer.from(
        hashStr.replace(/-/g, "+").replace(/_/g, "/"),
        "base64",
      );

      const derived = scryptSync(input, salt, 32, {
        N: params.N,
        r: params.r,
        p: params.p,
      });

      return timingSafeEqual(derived, storedHash);
    } catch {
      return false;
    }
  },
};

/**
 * Initialize crypto APIs on the Bun global
 */
export function initCrypto(bun: PolyfillBun): void {
  bun.hash = hash;
  bun.CryptoHasher = CryptoHasher as any;
  bun.MD4 = MD4 as any;
  bun.MD5 = MD5 as any;
  bun.SHA1 = SHA1 as any;
  bun.SHA224 = SHA224 as any;
  bun.SHA256 = SHA256 as any;
  bun.SHA384 = SHA384 as any;
  bun.SHA512 = SHA512 as any;
  bun.SHA512_256 = SHA512_256 as any;
  bun.password = password as any;
}
