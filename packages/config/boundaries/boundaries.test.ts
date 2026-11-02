import { afterAll, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { checkBoundaries } from "./check-boundaries.js";

const REPO_ROOT = path.resolve(import.meta.dir, "../../..");

const has = (list: string[], fragment: string) =>
  expect(list).toContainEqual(expect.stringContaining(fragment));

describe("this repo", () => {
  const report = checkBoundaries(REPO_ROOT);

  it("keeps core's layers in ADR-0008 order", () => {
    expect(report.coreLayers).toEqual([]);
  });

  it("imports workspaces only as declared, through their exports", () => {
    expect(report.workspaces).toEqual([]);
  });

  it("keeps templates on the authoring surface", () => {
    expect(report.templates).toEqual([]);
  });

  it("declares every workspace", () => {
    expect(report.undeclaredWorkspaces).toEqual([]);
  });

  it("has no stale exceptions", () => {
    expect(report.unusedExceptions).toEqual([]);
  });

  it("decides each rule in one place", () => {
    expect(report.forbiddenPatterns).toEqual([]);
  });
});

describe("the checker", () => {
  const root = mkdtempSync(path.join(tmpdir(), "boundaries-"));
  afterAll(() => rmSync(root, { force: true, recursive: true }));

  const files: Record<string, string> = {
    "examples/templates/ok.tsx": `import { z } from "zod";`,
    "package.json": JSON.stringify({ workspaces: ["packages/*"] }),
    "packages/cli/package.json": JSON.stringify({ name: "@stdout-design/cli" }),
    "packages/cli/src/deep.ts": `import x from "@stdout-design/core/dist/index.mjs";`,
    "packages/cli/src/escape.ts": `import x from "../../core/src/index.js";`,
    "packages/cli/src/generated.ts": `export const config = \`import { a } from "@stdout-design/web-ui";\`;`,
    "packages/cli/src/ok.ts": `import { renderComponent } from "@stdout-design/core";`,
    "packages/cli/template/templates/bad.tsx": `import { renderComponent } from "@stdout-design/core";`,
    "packages/core/package.json": JSON.stringify({
      exports: { ".": {}, "./schema": {} },
      name: "@stdout-design/core",
    }),
    "packages/core/src/assets/types-ok.ts": `import type { Font } from "../engine/shim.js";`,
    "packages/core/src/assets/value.ts": `import { render } from "../engine/shim.js";`,
    "packages/core/src/engine/shim.ts": `export const render = 1;`,
    "packages/core/src/orchestrate/o.ts": `import { b } from "../batch/b.js";`,
    "packages/core/src/rogue/r.ts": `export const r = 1;`,
    "packages/core/src/shared/io.ts": `import { readFile } from "node:fs/promises";`,
    "packages/core/src/shared/up.ts": `import type { Policy } from "../assets/types-ok.js";`,
    "packages/web-ui/package.json": JSON.stringify({
      name: "@stdout-design/web-ui",
    }),
    "packages/web-ui/src/app.ts": `import { renderComponent } from "@stdout-design/core";`,
    "packages/web-ui/src/rtl.ts": `export const isRtl = (locale: string) => locale.startsWith("ar");`,
  };
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), content);
  }

  const report = checkBoundaries(root);

  it("reports each core layer violation", () => {
    has(report.coreLayers, "shared/io.ts → node:fs/promises");
    has(
      report.coreLayers,
      'shared/up.ts → ../assets/types-ok.js: "shared" may not import "assets"'
    );
    has(
      report.coreLayers,
      'assets/value.ts → ../engine/shim.js: "assets" may import "engine" with `import type` only'
    );
    has(
      report.coreLayers,
      'orchestrate/o.ts → ../batch/b.js: "orchestrate" may not import "batch"'
    );
    has(report.coreLayers, '"rogue" is not a core layer');
    expect(report.coreLayers).toHaveLength(5);
  });

  it("reports undeclared, deep, and escaping workspace imports", () => {
    has(
      report.workspaces,
      "web-ui/src/app.ts → @stdout-design/core: @stdout-design/web-ui may not depend on"
    );
    has(
      report.workspaces,
      `"./dist/index.mjs" is not in @stdout-design/core's exports`
    );
    has(
      report.workspaces,
      "cli/src/escape.ts → ../../core/src/index.js: reaches outside"
    );
    expect(report.workspaces).toHaveLength(3);
  });

  it("ignores specifiers inside strings", () => {
    expect(report.workspaces.join("\n")).not.toContain("generated.ts");
  });

  it("keeps templates off the engine", () => {
    expect(report.templates).toEqual([
      expect.stringContaining("templates/bad.tsx → @stdout-design/core:"),
    ]);
  });

  it("flags a locale prefix test with its line", () => {
    expect(report.forbiddenPatterns).toEqual([
      expect.stringContaining("packages/web-ui/src/rtl.ts:1:"),
    ]);
  });

  it("flags workspaces missing from the table, both ways", () => {
    has(report.undeclaredWorkspaces, "web-docs: in WORKSPACES but not on disk");
  });
});
