import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";

import { logWarn } from "../shared/logger.js";

export const ensureDir = async (dir: string): Promise<void> => {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
};

export const tryWriteFile = async (
  filePath: string,
  data: Buffer
): Promise<void> => {
  try {
    await writeFile(filePath, data);
  } catch (error) {
    logWarn("Failed to write output file", {
      error: String(error),
      filePath,
    });
  }
};
