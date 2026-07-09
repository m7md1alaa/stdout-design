import path from "node:path";

import { ErrorCode, logError } from "@stdout-design/core";

import { createDevServer } from "./index.js";

const { resolve } = path;

const rootDir =
  process.argv[2] ?? resolve(import.meta.dir, "../../../examples");

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

const shutdown = async () => {
  console.log("\nShutting down...");
  await server.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
