import { describe, expect, it } from "bun:test";
import path from "node:path";

import { resolveProjectPaths } from "./project-paths.js";

describe("resolveProjectPaths", () => {
  it("resolves the conventional studio project paths from a root directory", () => {
    const rootDir = "/tmp/example-studio";

    const paths = resolveProjectPaths(rootDir);

    expect(paths.configPath).toBe(path.resolve(rootDir, "studio.config.ts"));
    expect(paths.templatesDir).toBe(path.resolve(rootDir, "templates"));
    expect(paths.localesDir).toBe(path.resolve(rootDir, "locales"));
    expect(paths.defaultCacheDir).toBe(path.resolve(rootDir, ".studio-cache"));
  });
});
