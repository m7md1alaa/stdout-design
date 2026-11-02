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

/** Compares dotted versions numerically: negative, zero or positive. */
export const compareVersions = (a: string, b: string): number => {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);
  const length = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < length; i += 1) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }

  return 0;
};
