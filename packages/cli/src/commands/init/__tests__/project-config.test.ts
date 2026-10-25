import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { STARTER_IDS } from "../catalog.js";
import { buildProjectConfig, startersSince } from "../project-config.js";

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
