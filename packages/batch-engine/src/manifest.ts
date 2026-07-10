import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Manifest } from "./types.js";

export const writeManifest = async (
  filePath: string,
  manifest: Manifest
): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(manifest, null, 2));
};
