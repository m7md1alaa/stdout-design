import { existsSync } from "node:fs";
import path from "node:path";

const CONFIG_FILE = "studio.config.ts";

/**
 * Walks up from `startDir` to the nearest directory containing
 * studio.config.ts, so commands work from any subdirectory of a project.
 * Falls back to `startDir` so the caller's "config not found" error names
 * the directory the user is actually in.
 */
export const findProjectRoot = (startDir: string = process.cwd()): string => {
  let dir = path.resolve(startDir);

  while (true) {
    if (existsSync(path.join(dir, CONFIG_FILE))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return path.resolve(startDir);
    }
    dir = parent;
  }
};

/**
 * Like {@link findProjectRoot}, but fails with an actionable message when no
 * studio.config.ts exists in `startDir` or any parent directory.
 */
export const requireProjectRoot = (
  startDir: string = process.cwd()
): string => {
  const root = findProjectRoot(startDir);
  if (!existsSync(path.join(root, CONFIG_FILE))) {
    throw new Error(
      `No ${CONFIG_FILE} found in ${path.resolve(startDir)} or any parent directory.\n` +
        "Run `studio init` to create a project, or cd into an existing one."
    );
  }
  return root;
};
