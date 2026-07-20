import path from "node:path";

export interface ProjectPaths {
  configPath: string;
  defaultCacheDir: string;
  localesDir: string;
  templatesDir: string;
}

export const resolveProjectPaths = (rootDir: string): ProjectPaths => ({
  configPath: path.resolve(rootDir, "studio.config.ts"),
  defaultCacheDir: path.resolve(rootDir, ".studio-cache"),
  localesDir: path.resolve(rootDir, "locales"),
  templatesDir: path.resolve(rootDir, "templates"),
});
