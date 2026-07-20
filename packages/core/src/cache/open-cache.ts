import { resolveProjectPaths } from "../project/project-paths.js";
import { RenderCache } from "./render-cache.js";

export interface OpenCacheOptions {
  cacheDir?: string;
  maxSizeMB?: number;
}

export const openCache = async (
  rootDir: string,
  options?: OpenCacheOptions
): Promise<RenderCache> => {
  const cache = new RenderCache({
    cacheDir: options?.cacheDir ?? resolveProjectPaths(rootDir).defaultCacheDir,
    maxSizeMB: options?.maxSizeMB,
  });
  await cache.init();
  return cache;
};
