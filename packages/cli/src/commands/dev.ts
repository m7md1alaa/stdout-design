import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

import { requireProjectRoot } from "../lib/project-root.js";

const openInBrowser = (url: string): void => {
  const commands: Record<string, [string, string[]]> = {
    darwin: ["open", [url]],
    win32: ["cmd", ["/c", "start", "", url]],
  };
  const [command, args] = commands[process.platform] ?? ["xdg-open", [url]];
  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  child.on("error", () => {
    console.log(`Could not open a browser — visit ${url}`);
  });
  child.unref();
};

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
  options: { port?: string; open?: boolean }
): Promise<void> => {
  const { startStandaloneServer } =
    await import("@stdout-design/dev-server").catch(() => {
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

  const resolvedRoot = requireProjectRoot(rootDir);
  const port = Number(options.port ?? "3030");
  const webUiDist = findWebUiDist();

  console.log(`Starting studio dev server for ${resolvedRoot}...`);

  await startStandaloneServer({
    port,
    rootDir: resolvedRoot,
    webUiDist,
  });

  if (options.open) {
    openInBrowser(`http://localhost:${port}`);
  }
};
