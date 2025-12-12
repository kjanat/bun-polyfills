import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { BuildContext } from "tsdown";
import { defineConfig } from "tsdown";

/**
 * Format output files with Prettier if available
 */
async function formatOutputFiles(ctx: BuildContext): Promise<void> {
  try {
    const prettier = await import("prettier");
    const outDir = resolve(ctx.options.outDir);

    const isFormatTarget = (fileName: string): boolean =>
      /\.(m?js|d\.m?ts)$/.test(fileName);

    const formatFile = async (absolutePath: string): Promise<void> => {
      const [content, options] = await Promise.all([
        Bun.file(absolutePath).text(),
        prettier.resolveConfig(absolutePath),
      ]);

      const formatted = await prettier.format(content, {
        ...options,
        filepath: absolutePath,
      });
      await Bun.write(absolutePath, formatted);
    };

    const walkAndFormat = async (dir: string): Promise<void> => {
      const entries = await readdir(dir, { withFileTypes: true });
      await Promise.all(
        entries.map(async (entry) => {
          // Skip node_modules and hidden directories
          if (entry.name === "node_modules" || entry.name.startsWith(".")) {
            return;
          }

          const absolutePath = resolve(dir, entry.name);
          if (entry.isDirectory()) {
            return walkAndFormat(absolutePath);
          }
          if (entry.isFile() && isFormatTarget(entry.name)) {
            return formatFile(absolutePath);
          }
        }),
      );
    };

    await walkAndFormat(outDir);
  } catch {
    // Prettier not installed or formatting failed - skip silently
  }
}

export default defineConfig({
  // Map outputs to package.json expectations
  entry: { index: "src/index.ts", cli: "src/cli.ts", types: "src/types.ts" },
  format: "esm",
  target: "esnext",
  platform: "node",
  outDir: "dist",
  clean: true,
  dts: true,
  exports: true,
  unbundle: true,
  sourcemap: false,
  hooks: { "build:done": formatOutputFiles },
  external: ["prettier"],
});
