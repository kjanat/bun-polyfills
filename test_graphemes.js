const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

function isWide(code) {
  if (
    (code >= 0x1100 && code <= 0x115f) || // Hangul Jamo
    (code >= 0x2329 && code <= 0x232a) || // Angle brackets
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
  ) {
    return true;
  }
  return false;
}

function getWidth(str) {
  let total = 0;
  for (const { segment } of segmenter.segment(str)) {
    // Zero width check for specific single-char segments
    if (segment.length === 1) {
      const code = segment.codePointAt(0);
      // Soft hyphen, zero width spaces, tags, etc.
      if (
        code === 0x00ad ||
        (code >= 0x200b && code <= 0x200f) ||
        code === 0xfeff
      ) {
        continue;
      }
    }

    // Heuristic: If it contains Emoji or Wide chars, it's 2.
    // Otherwise 1 (unless it's purely non-spacing marks, which Intl shouldn't return as a standalone segment usually, or if it does, it's attached to a base)

    // Check if any char in segment is wide
    let isSegmentWide = false;
    let hasEmoji = false;
    for (const char of segment) {
      const cp = char.codePointAt(0);
      if (isWide(cp)) {
        isSegmentWide = true;
        // Crude emoji check: Most emojis are in wide ranges or specific blocks
        // We might need a tighter emoji check.
      }
    }

    // Correction: Base char matters most?
    const first = segment.codePointAt(0);
    if (isWide(first)) {
      total += 2;
    } else {
      // e.g. "a" + accent
      total += 1;
    }
  }
  return total;
}

console.log("Family:", getWidth("👨‍👩‍👧‍👦")); // Expect 2
console.log("Flag:", getWidth("🏳️‍🌈")); // Expect 2
console.log("Accent:", getWidth("a\u0300")); // Expect 1
console.log("Emoji:", getWidth("😀")); // Expect 2
