import type { BunPlugin } from "bun";
/**
 * Bun build plugin that conditionally excludes polyfills when building for Bun target.
 * When target is "bun", polyfill modules are replaced with empty stubs.
 * When target is "node", polyfills are included normally.
 */
export declare const conditionalPolyfillPlugin: BunPlugin;
export default conditionalPolyfillPlugin;
