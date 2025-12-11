// Bun utility functions polyfill
// Covers: escapeHTML, stringWidth, stripANSI, peek, deepEquals, deepMatch, concatArrayBuffers, inspect

import * as util from "node:util";

import type { PolyfillBun } from "./types.ts";

// HTML entity map
const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

/**
 * Escape HTML entities in a string
 */
export function escapeHTML(input: string | object | number | boolean): string {
  const str = String(input);
  return str.replace(/[&<>"']/g, (char) => HTML_ENTITIES[char] ?? char);
}

// ANSI escape sequence regex (using hex escapes to avoid control character lint)
const ANSI_REGEX = new RegExp(
  "[\x1b\x9b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]",
  "g",
);

/**
 * Strip ANSI escape codes from a string
 */
export function stripANSI(input: string): string {
  return input.replace(ANSI_REGEX, "");
}

/**
 * Get the visual width of a string (accounting for wide characters)
 * Simplified implementation - doesn't handle all edge cases
 */
export function stringWidth(input: string): number {
  // Strip ANSI codes first
  const stripped = stripANSI(input);

  let width = 0;
  for (const char of stripped) {
    const code = char.codePointAt(0) ?? 0;

    // Control characters
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) {
      continue;
    }

    // Combining characters (zero width)
    if (code >= 0x0300 && code <= 0x036f) {
      continue;
    }

    // Wide characters (CJK, emoji, etc.)
    if (
      (code >= 0x1100 && code <= 0x115f) || // Hangul Jamo
      (code >= 0x2e80 && code <= 0xa4cf) || // CJK
      (code >= 0xac00 && code <= 0xd7a3) || // Hangul Syllables
      (code >= 0xf900 && code <= 0xfaff) || // CJK Compatibility Ideographs
      (code >= 0xfe10 && code <= 0xfe1f) || // Vertical forms
      (code >= 0xfe30 && code <= 0xfe6f) || // CJK Compatibility Forms
      (code >= 0xff00 && code <= 0xff60) || // Fullwidth Forms
      (code >= 0xffe0 && code <= 0xffe6) || // Fullwidth Forms
      (code >= 0x20000 && code <= 0x2fffd) || // CJK Extension B
      (code >= 0x30000 && code <= 0x3fffd) // CJK Extension C-G
    ) {
      width += 2;
      continue;
    }

    width += 1;
  }

  return width;
}

/**
 * Peek at a promise's state without awaiting it
 * Returns the value if resolved, throws if rejected, returns the promise if pending
 *
 * Note: This is a simplified implementation. Bun has native support for synchronously
 * checking promise state, which we cannot fully replicate in userland JS.
 */
export function peek<T>(promise: T | Promise<T>): Promise<T> | T {
  // For non-promises, just return as-is
  if (!(promise instanceof Promise)) {
    return promise;
  }

  // We track the promise state via side effects
  // This works for already-resolved promises but not for truly pending ones
  const tracker = {
    state: "pending" as "pending" | "fulfilled" | "rejected",
    value: undefined as T | undefined,
    error: undefined as unknown,
  };

  promise.then(
    (v) => {
      tracker.state = "fulfilled";
      tracker.value = v;
    },
    (e) => {
      tracker.state = "rejected";
      tracker.error = e;
    },
  );

  // Check if promise settled synchronously (microtask already ran)
  // This won't catch truly async promises
  if (tracker.state === "fulfilled") {
    return tracker.value as T;
  }
  if (tracker.state === "rejected") {
    throw tracker.error;
  }

  // Still pending - return the promise itself
  return promise;
}

// Add status property to peek
peek.status = <T>(
  promise: Promise<T>,
): "pending" | "fulfilled" | "rejected" => {
  const tracker = { state: "pending" as "pending" | "fulfilled" | "rejected" };

  promise.then(
    () => {
      tracker.state = "fulfilled";
    },
    () => {
      tracker.state = "rejected";
    },
  );

  return tracker.state;
};

/**
 * Deep equality check
 */
export function deepEquals(a: unknown, b: unknown, strict = false): boolean {
  if (a === b) return true;

  if (typeof a !== typeof b) return false;

  if (a === null || b === null) return a === b;

  if (typeof a !== "object") {
    // For non-strict mode, check NaN
    if (
      !strict &&
      typeof a === "number" &&
      Number.isNaN(a) &&
      Number.isNaN(b as number)
    ) {
      return true;
    }
    return false;
  }

  // Arrays
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEquals(a[i], b[i], strict)) return false;
    }
    return true;
  }

  // Objects
  if (Array.isArray(b)) return false;

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;

  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);

  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(bObj, key)) return false;
    if (!deepEquals(aObj[key], bObj[key], strict)) return false;
  }

  return true;
}

/**
 * Deep match - check if subset matches a
 */
export function deepMatch(subset: unknown, a: unknown): boolean {
  if (subset === a) return true;

  if (typeof subset !== typeof a) return false;

  if (subset === null || a === null) return subset === a;

  if (typeof subset !== "object") return false;

  // Arrays - subset must be contained in a
  if (Array.isArray(subset)) {
    if (!Array.isArray(a)) return false;
    for (const item of subset) {
      if (!a.some((aItem) => deepMatch(item, aItem))) {
        return false;
      }
    }
    return true;
  }

  // Objects - all keys in subset must match in a
  if (Array.isArray(a)) return false;

  const subObj = subset as Record<string, unknown>;
  const aObj = a as Record<string, unknown>;

  for (const key of Object.keys(subObj)) {
    if (!Object.prototype.hasOwnProperty.call(aObj, key)) return false;
    if (!deepMatch(subObj[key], aObj[key])) return false;
  }

  return true;
}

/**
 * Concatenate array buffers
 */
export function concatArrayBuffers(
  buffers: Array<ArrayBufferView | ArrayBufferLike>,
  maxLength?: number,
): ArrayBuffer {
  // Calculate total length
  let totalLength = 0;
  for (const buf of buffers) {
    const byteLength =
      ArrayBuffer.isView(buf) ? buf.byteLength : buf.byteLength;
    totalLength += byteLength;
  }

  // Apply max length
  if (maxLength !== undefined && totalLength > maxLength) {
    totalLength = maxLength;
  }

  // Create result buffer
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const buf of buffers) {
    if (offset >= totalLength) break;

    const view =
      ArrayBuffer.isView(buf) ?
        new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
      : new Uint8Array(buf);

    const remaining = totalLength - offset;
    const toCopy = Math.min(view.length, remaining);

    result.set(view.subarray(0, toCopy), offset);
    offset += toCopy;
  }

  return result.buffer;
}

/**
 * Inspect a value (like console.log but returns string)
 */
export function inspect(
  arg: unknown,
  options?: { depth?: number; colors?: boolean },
): string {
  return util.inspect(arg, {
    depth: options?.depth ?? 2,
    colors: options?.colors ?? false,
  });
}

/**
 * Initialize utility functions on Bun global
 */
export function initUtils(bun: Partial<PolyfillBun>): void {
  if (!("escapeHTML" in bun)) {
    (bun as Record<string, unknown>).escapeHTML = escapeHTML;
  }

  if (!("stripANSI" in bun)) {
    (bun as Record<string, unknown>).stripANSI = stripANSI;
  }

  if (!("stringWidth" in bun)) {
    (bun as Record<string, unknown>).stringWidth = stringWidth;
  }

  if (!("peek" in bun)) {
    (bun as Record<string, unknown>).peek = peek;
  }

  if (!("deepEquals" in bun)) {
    (bun as Record<string, unknown>).deepEquals = deepEquals;
  }

  if (!("deepMatch" in bun)) {
    (bun as Record<string, unknown>).deepMatch = deepMatch;
  }

  if (!("concatArrayBuffers" in bun)) {
    (bun as Record<string, unknown>).concatArrayBuffers = concatArrayBuffers;
  }

  if (!("inspect" in bun)) {
    (bun as Record<string, unknown>).inspect = inspect;
  }
}
