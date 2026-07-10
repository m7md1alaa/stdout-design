export const dev = async (
  rootDir: string | undefined,
  options: Record<string, string | undefined>
): Promise<void> => {
  const { createDevServer } = await import("@stdout-design/dev-server");

  const resolvedRoot = rootDir ?? process.cwd();
  const port = Number(options.port ?? "3000");

  console.log(`Starting studio dev server for ${resolvedRoot}...`);

  const server = await createDevServer({
    port,
    rootDir: resolvedRoot,
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
