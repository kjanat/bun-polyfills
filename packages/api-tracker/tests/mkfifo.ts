/**
 * Shell-based mkfifo helper for Unix systems
 * Mirrors Bun's test/mkfifo.ts but uses shell command instead of FFI
 */
import { spawnSync } from "node:child_process";
import os from "node:os";

export function mkfifo(path: string, mode = 0o666): void {
  if (os.platform() === "win32") {
    throw new Error("mkfifo is not supported on Windows");
  }

  const result = spawnSync("mkfifo", ["-m", mode.toString(8), path]);

  if (result.error) {
    if ((result.error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error("mkfifo binary not found in PATH");
    }
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = result.stderr?.toString("utf8") ?? "";
    throw new Error(`mkfifo failed with code ${result.status}: ${stderr}`);
  }
}
