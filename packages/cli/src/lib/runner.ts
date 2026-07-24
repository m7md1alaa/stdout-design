import { cacheStats, cacheClean } from "../commands/cache.js";
import { dev } from "../commands/dev.js";
import { init } from "../commands/init.js";
import { lint } from "../commands/lint.js";
import { render } from "../commands/render.js";
import { skillInstall } from "../commands/skill.js";
import { update } from "../commands/update.js";
import { formatError } from "./display.js";

const handlers: Record<string, (...args: never[]) => unknown> = {
  cache: cacheStats,
  cacheClean,
  cacheStats,
  dev,
  init,
  lint,
  render,
  skillInstall,
  update,
};

export const run =
  (moduleName: string, handlerName?: string) =>
  async (...args: unknown[]) => {
    try {
      const handler = handlerName
        ? handlers[handlerName]
        : handlers[moduleName];
      if (!handler) {
        throw new Error(`Unknown command: ${handlerName ?? moduleName}`);
      }
      await handler(...(args as never[]));
    } catch (error) {
      console.error(formatError(error));
      process.exit(1);
    }
  };
