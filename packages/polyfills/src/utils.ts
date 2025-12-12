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

/**
 * Strip ANSI escape codes from a string using a state machine
 * Based on Bun's C++ implementation in stripANSI.cpp
 */
export function stripANSI(input: string): string {
  if (input.length === 0) return input;

  // State machine for parsing ANSI sequences
  enum State {
    Normal,
    GotEsc,
    IgnoreNextChar,
    InCsi,
    InOsc,
    InOscGotEsc,
    NeedSt,
    NeedStGotEsc,
  }

  let result = "";
  let state = State.Normal;
  let segmentStart = 0;

  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);

    switch (state) {
      case State.Normal:
        if (code === 0x1b) {
          // ESC
          if (i > segmentStart) {
            result += input.slice(segmentStart, i);
          }
          state = State.GotEsc;
        } else if (code === 0x9b) {
          // CSI
          if (i > segmentStart) {
            result += input.slice(segmentStart, i);
          }
          state = State.InCsi;
        } else if (code === 0x9d) {
          // OSC
          if (i > segmentStart) {
            result += input.slice(segmentStart, i);
          }
          state = State.InOsc;
        } else if (
          code === 0x90 ||
          code === 0x98 ||
          code === 0x9e ||
          code === 0x9f
        ) {
          // Other sequences terminated by ST
          if (i > segmentStart) {
            result += input.slice(segmentStart, i);
          }
          state = State.NeedSt;
        }
        break;

      case State.GotEsc:
        if (code === 0x5b) {
          // [
          state = State.InCsi;
        } else if (
          code === 0x20 ||
          code === 0x23 ||
          code === 0x25 ||
          code === 0x28 ||
          code === 0x29 ||
          code === 0x2a ||
          code === 0x2b ||
          code === 0x2e ||
          code === 0x2f
        ) {
          // Two-byte XTerm sequences
          state = State.IgnoreNextChar;
        } else if (code === 0x5d) {
          // ]
          state = State.InOsc;
        } else if (
          code === 0x50 ||
          code === 0x58 ||
          code === 0x5e ||
          code === 0x5f
        ) {
          // P, X, ^, _ - Other sequences terminated by ST
          state = State.NeedSt;
        } else {
          // One-byte sequence
          state = State.Normal;
          segmentStart = i + 1;
        }
        break;

      case State.IgnoreNextChar:
        state = State.Normal;
        segmentStart = i + 1;
        break;

      case State.InCsi:
        // CSI final byte range: 0x40-0x7E
        if (code >= 0x40 && code <= 0x7e) {
          state = State.Normal;
          segmentStart = i + 1;
        }
        break;

      case State.InOsc:
        if (code === 0x1b) {
          state = State.InOscGotEsc;
        } else if (code === 0x9c || code === 0x07) {
          // ST or BEL (XTerm ends OSC with BEL)
          state = State.Normal;
          segmentStart = i + 1;
        }
        break;

      case State.InOscGotEsc:
        if (code === 0x5c) {
          // backslash - ESC \ is ST
          state = State.Normal;
          segmentStart = i + 1;
        } else {
          state = State.InOsc;
        }
        break;

      case State.NeedSt:
        if (code === 0x1b) {
          state = State.NeedStGotEsc;
        } else if (code === 0x9c) {
          // ST
          state = State.Normal;
          segmentStart = i + 1;
        }
        break;

      case State.NeedStGotEsc:
        if (code === 0x5c) {
          // backslash - ESC \ is ST
          state = State.Normal;
          segmentStart = i + 1;
        } else {
          state = State.NeedSt;
        }
        break;
    }
  }

  // Append any remaining text
  if (segmentStart < input.length && state === State.Normal) {
    result += input.slice(segmentStart);
  }

  return result;
}

function isZeroWidthCodePoint(code: number): boolean {
  // C0 control codes
  if (code <= 0x1f) return true;

  // C1 control codes
  if (code >= 0x7f && code <= 0x9f) return true;

  // Soft hyphen
  if (code === 0x00ad) return true;

  // Combining Diacritical Marks
  if (code >= 0x0300 && code <= 0x036f) return true;

  // Zero width space/joiners/marks
  if (code >= 0x200b && code <= 0x200f) return true;

  // Word joiner & invisible operators
  if (code >= 0x2060 && code <= 0x2064) return true;

  // Combining Diacritical Marks for Symbols
  if (code >= 0x20d0 && code <= 0x20ff) return true;

  // Arabic formatting characters
  if (
    (code >= 0x600 && code <= 0x605) ||
    code === 0x6dd ||
    code === 0x70f ||
    code === 0x8e2
  )
    return true;

  // Indic script combining marks (Devanagari through Malayalam)
  if (code >= 0x900 && code <= 0xd4f) {
    const offset = code & 0x7f;
    // Signs at block start (except position 0x03 which is Visarga - visible)
    if (offset <= 0x02) return true;
    // Vowel signs, virama (0x3a-0x4d), but exclude:
    // - 0x3D (Avagraha - visible letter in most blocks)
    if (offset >= 0x3a && offset <= 0x4d && offset !== 0x3d) return true;
    // Stress signs (0x51-0x57)
    if (offset >= 0x51 && offset <= 0x57) return true;
    // Vowel signs (0x62-0x63)
    if (offset >= 0x62 && offset <= 0x63) return true;
  }

  // Thai combining marks
  if ((code >= 0xe31 && code <= 0xe3a) || (code >= 0xe47 && code <= 0xe4e))
    return true;

  // Lao combining marks
  if ((code >= 0xeb1 && code <= 0xebc) || (code >= 0xec8 && code <= 0xecd))
    return true;

  // Hangul Jamo Filler
  if (code >= 0x115f && code <= 0x1160) return true;

  // Combining Diacritical Marks Extended
  if (code >= 0x1ab0 && code <= 0x1aff) return true;

  // Combining Diacritical Marks Supplement
  if (code >= 0x1dc0 && code <= 0x1dff) return true;

  // Mongolian variation selectors
  if (code >= 0x180b && code <= 0x180f) return true;

  // Variation Selectors (but NOT when determining emoji width - handled separately)
  if (code >= 0xfe00 && code <= 0xfe0f) return true;

  // Combining Half Marks
  if (code >= 0xfe20 && code <= 0xfe2f) return true;

  // BOM / ZWNBSP
  if (code === 0xfeff) return true;

  // Interlinear annotation
  if (code >= 0xfff9 && code <= 0xfffb) return true;

  // Lone surrogates (invalid UTF-16)
  if (code >= 0xd800 && code <= 0xdfff) return true;

  // Tag characters
  if (code >= 0xe0000 && code <= 0xe007f) return true;

  // Variation Selectors Supplement
  if (code >= 0xe0100 && code <= 0xe01ef) return true;

  return false;
}

function isWideCodePoint(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x115f) || // Hangul Jamo
    (code >= 0x231a && code <= 0x231b) || // Watch, Hourglass
    (code >= 0x2329 && code <= 0x232a) || // Angle brackets
    (code >= 0x23e9 && code <= 0x23ec) || // Fast forward, etc
    code === 0x23f0 || // Alarm clock
    code === 0x23f3 || // Hourglass with flowing sand
    (code >= 0x25fd && code <= 0x25fe) || // Geometric shapes
    (code >= 0x2614 && code <= 0x2615) || // Umbrella, Hot bev
    (code >= 0x2648 && code <= 0x2653) || // Zodiac
    code === 0x267f || // Wheelchair
    code === 0x2693 || // Anchor
    code === 0x26a1 || // High voltage
    (code >= 0x26aa && code <= 0x26ab) || // Circles
    (code >= 0x26bd && code <= 0x26be) || // Sports
    (code >= 0x26c4 && code <= 0x26c5) || // Weather
    code === 0x26ce || // Ophiuchus
    code === 0x26d4 || // No entry
    code === 0x26ea || // Church
    (code >= 0x26f2 && code <= 0x26f3) || // Fountain, Flag in hole
    code === 0x26f5 || // Boat
    code === 0x26fa || // Tent
    code === 0x26fd || // Fuel pump
    code === 0x2705 || // Check mark
    (code >= 0x270a && code <= 0x270b) || // Hands
    code === 0x2728 || // Sparkles
    code === 0x274c || // Cross mark
    code === 0x274e || // Cross mark button
    (code >= 0x2753 && code <= 0x2755) || // Questions, Exclamation
    code === 0x2757 || // Exclamation
    (code >= 0x2795 && code <= 0x2797) || // Math symbols
    code === 0x27b0 || // Loop
    code === 0x27bf || // Loop
    (code >= 0x2b1b && code <= 0x2b1c) || // Squares
    code === 0x2b50 || // Star
    code === 0x2b55 || // Circle
    (code >= 0x2e80 && code <= 0xa4cf) || // CJK
    (code >= 0xac00 && code <= 0xd7a3) || // Hangul Syllables
    (code >= 0xf900 && code <= 0xfaff) || // CJK Compatibility Ideographs
    (code >= 0xfe10 && code <= 0xfe1f) || // Vertical forms
    (code >= 0xfe30 && code <= 0xfe6f) || // CJK Compatibility Forms
    (code >= 0xff00 && code <= 0xff60) || // Fullwidth Forms
    (code >= 0xffe0 && code <= 0xffe6) || // Fullwidth Forms
    (code >= 0x1f000 && code <= 0x1f64f) || // Emoticons
    (code >= 0x1f680 && code <= 0x1f6ff) || // Transport and Map Symbols
    (code >= 0x1f900 && code <= 0x1f9ff) || // Supplemental Symbols and Pictographs
    (code >= 0x20000 && code <= 0x2fffd) || // CJK Extension B
    (code >= 0x30000 && code <= 0x3fffd) // CJK Extension C-G
  );
}

function isRegionalIndicator(code: number): boolean {
  return code >= 0x1f1e6 && code <= 0x1f1ff;
}

/**
 * Get the visual width of a string (accounting for wide characters)
 */
export function stringWidth(
  input: string,
  options?: { countAnsiEscapeCodes?: boolean; ambiguousIsNarrow?: boolean },
): number {
  const countAnsi = options?.countAnsiEscapeCodes ?? false;
  // const ambiguousIsNarrow = options?.ambiguousIsNarrow ?? true;

  // If counting ANSI codes, use raw string. Otherwise strip them.
  const str = countAnsi ? input : stripANSI(input);

  if (!str || str.length === 0) {
    return 0;
  }

  // Use Intl.Segmenter to handle grapheme clusters correctly
  const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
  let width = 0;

  for (const { segment } of segmenter.segment(str)) {
    let segmentWidth = 1;
    let hasWide = false;
    let allZeroWidth = true;
    let charCount = 0;
    let allRegional = true;
    let hasEmojiPresentation = false;
    let firstCodePoint = 0;

    for (const char of segment) {
      const code = char.codePointAt(0);
      if (code === undefined) {
        continue;
      }

      if (charCount === 0) {
        firstCodePoint = code;
      }
      charCount++;

      if (!isZeroWidthCodePoint(code)) {
        allZeroWidth = false;
      }

      if (isWideCodePoint(code)) {
        hasWide = true;
      }

      if (!isRegionalIndicator(code)) {
        allRegional = false;
      }

      // Check for emoji presentation selector (U+FE0F)
      if (code === 0xfe0f) {
        hasEmojiPresentation = true;
      }
    }

    if (allZeroWidth) {
      segmentWidth = 0;
    } else if (allRegional && charCount >= 2) {
      // Flag sequences (2+ regional indicators) are wide
      segmentWidth = 2;
    } else if (allRegional && charCount === 1) {
      // Single regional indicator is narrow
      segmentWidth = 1;
    } else if (hasEmojiPresentation) {
      // VS16 (FE0F) emoji presentation selector
      // Special case: ASCII characters + VS16 stay narrow (width 1)
      // This includes digits 0-9, #, *, and all other ASCII < 0x80
      if (firstCodePoint < 0x80) {
        segmentWidth = 1;
      } else if (hasWide) {
        // If base character is already wide, keep it wide
        segmentWidth = 2;
      } else {
        // Non-ASCII + VS16 → emoji presentation → width 2
        segmentWidth = 2;
      }
    } else if (hasWide) {
      segmentWidth = 2;
    }

    width += segmentWidth;
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
    if (!Object.hasOwn(bObj, key)) return false;
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
    if (!Object.hasOwn(aObj, key)) return false;
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
export function initUtils(Bun: Partial<PolyfillBun>): void {
  if (!("escapeHTML" in Bun)) {
    (Bun as Record<string, unknown>).escapeHTML = escapeHTML;
  }

  if (!("stripANSI" in Bun)) {
    (Bun as Record<string, unknown>).stripANSI = stripANSI;
  }

  if (!("stringWidth" in Bun)) {
    (Bun as Record<string, unknown>).stringWidth = stringWidth;
  }

  if (!("peek" in Bun)) {
    (Bun as Record<string, unknown>).peek = peek;
  }

  if (!("deepEquals" in Bun)) {
    (Bun as Record<string, unknown>).deepEquals = deepEquals;
  }

  if (!("deepMatch" in Bun)) {
    (Bun as Record<string, unknown>).deepMatch = deepMatch;
  }

  if (!("concatArrayBuffers" in Bun)) {
    (Bun as Record<string, unknown>).concatArrayBuffers = concatArrayBuffers;
  }

  if (!("inspect" in Bun)) {
    (Bun as Record<string, unknown>).inspect = inspect;
  }
}
