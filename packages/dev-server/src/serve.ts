import { resolve } from "node:path";

import { createDevServer } from "./index.js";

const rootDir =
  process.argv[2] ?? resolve(import.meta.dir, "../../../examples");

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

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
