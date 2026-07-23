import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { update } from "../update.js";

const inTempDir = () => {
  const dir = mkdtempSync(path.join(tmpdir(), "studio-update-test-"));
  return dir;
};

describe("update", () => {
  test("throws when studio.config.ts does not exist", async () => {
    const dir = inTempDir();

    try {
      await expect(update(dir)).rejects.toThrow(
        "No studio project found. Run `studio init` first."
      );
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});
