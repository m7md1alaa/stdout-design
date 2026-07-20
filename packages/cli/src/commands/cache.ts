import { RenderCache, resolveProjectPaths } from "@stdout-design/core";

import { formatCacheStats, formatCacheCleanResult } from "../lib/display.js";

export const cacheStats = async (
  rootDir: string | undefined,
  options: { json?: boolean }
): Promise<void> => {
  const dir = resolveProjectPaths(rootDir ?? process.cwd()).defaultCacheDir;
  const cache = new RenderCache({ cacheDir: dir });
  await cache.init();

  const stats = await cache.stats();
  cache.close();

  if (options.json) {
    console.log(JSON.stringify(stats, null, 2));
  } else {
    console.log(formatCacheStats(stats));
  }
};

export const cacheClean = async (
  rootDir: string | undefined,
  options: { json?: boolean }
): Promise<void> => {
  const dir = resolveProjectPaths(rootDir ?? process.cwd()).defaultCacheDir;
  const cache = new RenderCache({ cacheDir: dir });
  await cache.init();

  const result = await cache.clean();
  cache.close();

  if (options.json) {
    console.log(JSON.stringify(result));
  } else {
    console.log(formatCacheCleanResult(result.freedBytes));
  }
};
