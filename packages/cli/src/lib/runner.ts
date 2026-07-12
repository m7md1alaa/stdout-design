import { formatError } from "./display.js";

export const run =
  (moduleName: string, handlerName?: string) =>
  async (...args: unknown[]) => {
    try {
      const mod = await import(`../commands/${moduleName}.js`);
      const handler = handlerName ? mod[handlerName] : mod[moduleName];
      await handler(...args);
    } catch (error) {
      console.error(formatError(error));
      process.exit(1);
    }
  };
