import { createRequire } from "node:module";
import path from "node:path";

const findWebUiDist = (): string | undefined => {
  try {
    const require = createRequire(import.meta.url);
    const pkgJsonPath = require.resolve("@stdout-design/web-ui/package.json");
    const pkgDir = path.dirname(pkgJsonPath);
    return path.join(pkgDir, "dist");
  } catch {
    // @stdout-design/web-ui not installed — the user may be running
    // studio dev from a project that doesn't have it yet.
  }
  return undefined;
};

export const dev = async (
  rootDir: string | undefined,
  options: Record<string, string | undefined>
): Promise<void> => {
  const { createDevServer } = await import(
    // @ts-expect-error - may not be installed
    "@stdout-design/dev-server"
  ).catch(() => {
    throw new Error(
      [
        "studio dev requires a scaffolded project with @stdout-design/dev-server installed.",
        "Run `studio init` to create one, or install it manually:",
        "",
        "  bun add @stdout-design/dev-server",
        "",
        "See https://stdout.design/docs for more information.",
      ].join("\n")
    );
  });

  const resolvedRoot = rootDir ?? process.cwd();
  const port = Number(options.port ?? "3000");
  const webUiDist = findWebUiDist();

  console.log(`Starting studio dev server for ${resolvedRoot}...`);

  const server = await createDevServer({
    port,
    rootDir: resolvedRoot,
    webUiDist,
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
