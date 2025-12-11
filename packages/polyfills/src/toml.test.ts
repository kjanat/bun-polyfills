import { describe, expect, test } from "bun:test";
import { TOML } from "./toml";

describe("TOML", () => {
  describe("parse", () => {
    test("parses simple key-value pairs", () => {
      const input = `
name = "test"
version = "1.0.0"
`;
      const result = TOML.parse(input);
      expect(result).toEqual({ name: "test", version: "1.0.0" });
    });

    test("parses nested tables", () => {
      const input = `
[package]
name = "my-package"
version = "1.0.0"

[dependencies]
lodash = "4.17.21"
`;
      const result = TOML.parse(input);
      expect(result).toEqual({
        package: { name: "my-package", version: "1.0.0" },
        dependencies: { lodash: "4.17.21" },
      });
    });

    test("parses arrays", () => {
      const input = `
numbers = [1, 2, 3]
strings = ["a", "b", "c"]
`;
      const result = TOML.parse(input);
      expect(result).toEqual({ numbers: [1, 2, 3], strings: ["a", "b", "c"] });
    });

    test("parses booleans", () => {
      const input = `
enabled = true
disabled = false
`;
      const result = TOML.parse(input);
      expect(result).toEqual({ enabled: true, disabled: false });
    });

    test("parses integers and floats", () => {
      const input = `
integer = 42
float = 3.14
negative = -17
`;
      const result = TOML.parse(input);
      expect(result).toEqual({ integer: 42, float: 3.14, negative: -17 });
    });

    test("parses inline tables", () => {
      const input = `point = { x = 1, y = 2 }`;
      const result = TOML.parse(input);
      expect(result).toEqual({ point: { x: 1, y: 2 } });
    });

    test("parses array of tables", () => {
      const input = `
[[products]]
name = "Hammer"
sku = 738594937

[[products]]
name = "Nail"
sku = 284758393
`;
      const result = TOML.parse(input);
      expect(result).toEqual({
        products: [
          { name: "Hammer", sku: 738594937 },
          { name: "Nail", sku: 284758393 },
        ],
      });
    });

    test("throws on non-string input", () => {
      expect(() => TOML.parse(123 as unknown as string)).toThrow(TypeError);
      expect(() => TOML.parse(null as unknown as string)).toThrow(TypeError);
    });

    test("throws on invalid TOML", () => {
      expect(() => TOML.parse("invalid = ")).toThrow();
    });
  });

  describe("stringify", () => {
    test("stringifies simple object", () => {
      const input = { name: "test", version: "1.0.0" };
      const result = TOML.stringify(input);
      expect(result).toContain('name = "test"');
      expect(result).toContain('version = "1.0.0"');
    });

    test("stringifies nested objects", () => {
      const input = { package: { name: "my-package", version: "1.0.0" } };
      const result = TOML.stringify(input);
      expect(result).toContain("[package]");
      expect(result).toContain('name = "my-package"');
    });

    test("stringifies arrays", () => {
      const input = { numbers: [1, 2, 3] };
      const result = TOML.stringify(input);
      expect(result).toContain("numbers = [");
    });

    test("stringifies booleans", () => {
      const input = { enabled: true, disabled: false };
      const result = TOML.stringify(input);
      expect(result).toContain("enabled = true");
      expect(result).toContain("disabled = false");
    });

    test("throws on non-object input", () => {
      expect(() => TOML.stringify("string" as never)).toThrow(TypeError);
      expect(() => TOML.stringify(null as never)).toThrow(TypeError);
      expect(() => TOML.stringify([1, 2, 3] as never)).toThrow(TypeError);
    });

    test("roundtrip: parse -> stringify -> parse", () => {
      const original = {
        name: "roundtrip-test",
        version: "2.0.0",
        config: { debug: true, port: 8080 },
        tags: ["test", "example"],
      };

      const tomlString = TOML.stringify(original);
      const parsed = TOML.parse(tomlString);
      expect(parsed).toEqual(original);
    });
  });
});
