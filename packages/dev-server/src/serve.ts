import { existsSync } from "node:fs";
import path from "node:path";

import { ErrorCode, logError, resolveProjectPaths } from "@stdout-design/core";

import { createDevServer } from "./index.js";

export const resolveStudioRoot = (cwd: string, givenArg?: string): string => {
  if (givenArg) {
    return path.resolve(givenArg);
  }

  let dir = cwd;
  while (true) {
    if (existsSync(resolveProjectPaths(dir).configPath)) {
      return dir;
    }
    if (
      existsSync(resolveProjectPaths(path.join(dir, "examples")).configPath)
    ) {
      return path.join(dir, "examples");
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  return cwd;
};

const startServer = async (): Promise<void> => {
  const rootDir = resolveStudioRoot(process.cwd(), process.argv[2]);
  const port = Math.trunc(Number(process.env.PORT ?? "3000"));

  const server = await createDevServer({
    port,
    rootDir,
  });

  Bun.serve({
    fetch: server.app.fetch,
    port: server.port,
  });

  console.log(`Studio dev server running on http://localhost:${server.port}`);

  const shutdown = async () => {
    console.log("\nShutting down...");
    await server.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

if (import.meta.main) {
  await startServer();
}

process.on("unhandledRejection", (reason) => {
  logError(ErrorCode.INTERNAL_ERROR, "Unhandled rejection", {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

process.on("uncaughtException", (error) => {
  logError(ErrorCode.INTERNAL_ERROR, "Uncaught exception", {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});
