import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { STARTERS, STARTER_IDS } from "../catalog.js";
import { buildProjectConfig, startersSince } from "../project-config.js";
import { compareVersions } from "../version.js";

const families = (entries: { family: string }[] | undefined) =>
  entries?.map((e) => e.family);

describe("buildProjectConfig", () => {
  test("registers only the chosen starters and records the locales", () => {
    const config = buildProjectConfig("0.6.0", {
      locales: ["en"],
      starters: ["launch-hero"],
    });

    expect(Object.keys(config.templates)).toEqual(["launch-hero"]);
    expect(config.templates["launch-hero"]?.componentPath).toBe(
      "./templates/launch-hero"
    );
    expect(config.locales).toEqual(["en"]);
    expect(config.scaffoldVersion).toBe("0.6.0");
  });

  test("loads only the fonts the chosen starters use", () => {
    const config = buildProjectConfig("0.6.0", {
      locales: ["en"],
      starters: ["launch-hero"],
    });

    expect(Object.keys(config.fonts ?? {})).toEqual(["default"]);
    expect(families(config.fonts?.default)).toEqual([
      "Archivo Black",
      "Space Mono",
    ]);
  });

  test("gives Arabic locales the Latin faces plus the Arabic ones", () => {
    const config = buildProjectConfig("0.6.0", {
      locales: ["en", "ar"],
      starters: ["bento-feature"],
    });

    expect(families(config.fonts?.ar)).toEqual([
      "Bricolage Grotesque",
      "Space Mono",
      "IBM Plex Sans Arabic",
    ]);
  });

  test("leaves fonts and locales out when there is nothing to configure", () => {
    const config = buildProjectConfig("0.6.0", { locales: [], starters: [] });

    expect(config.fonts).toBeUndefined();
    expect(config.locales).toBeUndefined();
    expect(config.templates).toEqual({});
  });
});

describe("startersSince", () => {
  test("returns every starter for a project with no scaffold version", () => {
    expect(startersSince(undefined, "0.6.0")).toEqual(STARTER_IDS);
  });

  test("returns the starters shipped after the project was created", () => {
    expect(startersSince("0.5.0", "0.6.0")).toEqual([
      "launch-hero",
      "retro-poster",
      "trend-poster",
    ]);
  });

  test("returns nothing for a project created by this version", () => {
    expect(startersSince("0.6.0", "0.6.0")).toEqual([]);
  });

  test("skips starters newer than the running CLI", () => {
    expect(startersSince("0.3.0", "0.5.0")).toEqual([]);
  });
});

describe("catalog", () => {
  const templateDir = path.resolve(import.meta.dirname, "../../../../template");
  const localeStrings = (locale: string) =>
    JSON.parse(
      readFileSync(path.join(templateDir, "locales", `${locale}.json`), "utf-8")
    );

  // `update` offers a starter to projects scaffolded before its `since`. A
  // `since` past the next release would make `update` later re-add a
  // starter the user left out at `init`, so it can be at most the next
  // minor (the pending changesets bump the fixed group by a minor).
  test.each(STARTERS.map((s) => [s.id, s.since]))(
    "%s ships no later than the next minor release (since %s)",
    (_id, since) => {
      const { version } = JSON.parse(
        readFileSync(
          path.resolve(import.meta.dirname, "../../../../package.json"),
          "utf-8"
        )
      ) as { version: string };
      const [major = 0, minor = 0] = version.split(".").map(Number);

      expect(
        compareVersions(since, `${major}.${minor + 1}.0`)
      ).toBeLessThanOrEqual(0);
    }
  );

  test.each(STARTER_IDS)(
    "%s ships a template and English and Arabic copy",
    (id) => {
      expect(existsSync(path.join(templateDir, "templates", `${id}.tsx`))).toBe(
        true
      );
      expect(localeStrings("en")).toHaveProperty([id]);
      expect(localeStrings("ar")).toHaveProperty([id]);
    }
  );
});
