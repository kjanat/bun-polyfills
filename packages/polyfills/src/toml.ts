// TOML polyfill: Bun.TOML
// Uses smol-toml as backend

import { parse, stringify } from "smol-toml";
import type { PolyfillBun } from "./types.ts";

export interface TOMLObject {
  [key: string]: TOMLValue;
}

export type TOMLValue =
  | string
  | number
  | boolean
  | Date
  | TOMLValue[]
  | TOMLObject;

/**
 * TOML parser/stringifier matching Bun's interface
 */
export const TOML = {
  /**
   * Parse a TOML string into a JavaScript object
   */
  parse(input: string): TOMLObject {
    if (typeof input !== "string") {
      throw new TypeError("TOML.parse expects a string");
    }
    return parse(input) as TOMLObject;
  },

  /**
   * Stringify a JavaScript object to TOML format
   */
  stringify(value: TOMLObject): string {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("TOML.stringify expects an object");
    }
    return stringify(value);
  },
};

/**
 * Initialize TOML on the Bun object
 */
export function initTOML(Bun: PolyfillBun): void {
  Bun.TOML = TOML;
}
