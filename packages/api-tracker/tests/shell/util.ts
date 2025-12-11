import { createTestBuilder } from "./test_builder";

export { createTestBuilder };

declare module "bun" {
  // Define the additional methods
  interface Shell {
    // biome-ignore lint/suspicious/noExplicitAny: shell expressions can be any type
    parse: (strings: TemplateStringsArray, ...expressions: any[]) => string;
    // biome-ignore lint/suspicious/noExplicitAny: shell expressions can be any type
    lex: (strings: TemplateStringsArray, ...expressions: any[]) => string;
  }
}

const defaultRedirect = {
  __unused: 0,
  append: false,
  stderr: false,
  stdin: false,
  stdout: false,
  duplicate_out: false,
};

export const redirect = (
  opts?: Partial<typeof defaultRedirect>,
): typeof defaultRedirect =>
  opts === undefined ? defaultRedirect : { ...defaultRedirect, ...opts };

export const sortedShellOutput = (output: string | string[]): string[] =>
  (Array.isArray(output) ? output : (
    output.split("\n").filter((s) => s.length > 0)
  )
  ).sort();
