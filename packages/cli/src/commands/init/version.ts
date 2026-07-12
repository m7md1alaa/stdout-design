import { createRequire } from "node:module";

export const getScaffoldVersion = (): string => {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require("@stdout-design/cli/package.json");
    return pkg.version;
  } catch {
    return "latest";
  }
};
