import { describe, expect, it } from "bun:test";

import { z } from "zod";

import { field } from "../template/field.js";
import {
  flattenTranslations,
  resolveLocaleLayers,
  translationsFromPaths,
} from "./locale-layers.js";

const schema = z.object({
  accent: field.color("#ff6a3d"),
  cta: field.object({
    label: field.text("Start"),
    url: field.text("https://x.dev", { translatable: false }),
  }),
  stats: field.list(
    z.object({ label: field.text("Users"), value: field.number(10) }),
    {
      default: [
        { label: "Users", value: 10 },
        { label: "Teams", value: 2 },
      ],
      length: 2,
    }
  ),
  tags: field.list(field.text("tag"), { default: ["a", "b"] }),
  title: field.text("Hello"),
});

const base = schema.parse({});

describe("translationsFromPaths", () => {
  it("builds the nested shape a locale file has, with null for untouched list items", () => {
    expect(
      translationsFromPaths({
        "cta.label": "ابدأ",
        "stats.1.label": "الفرق",
        "tags.0": "أ",
        title: "مرحبا",
      })
    ).toEqual({
      cta: { label: "ابدأ" },
      stats: [null, { label: "الفرق" }],
      tags: ["أ"],
      title: "مرحبا",
    });
  });
});

describe("flattenTranslations", () => {
  it("lists every translatable string a locale file sets, by path", () => {
    expect(
      flattenTranslations(schema, {
        accent: "#000000",
        cta: { label: "ابدأ", url: "https://evil.example" },
        stats: [{ label: "المستخدمون", value: 999 }, { label: "الفرق" }],
        tags: ["أ", "ب"],
        title: "مرحبا",
        unknown: "x",
      })
    ).toEqual({
      "cta.label": "ابدأ",
      "stats.0.label": "المستخدمون",
      "stats.1.label": "الفرق",
      "tags.0": "أ",
      "tags.1": "ب",
      title: "مرحبا",
    });
  });

  it("skips values of the wrong type and empty files", () => {
    expect(flattenTranslations(schema, { tags: "a", title: 3 })).toEqual({});
    expect(flattenTranslations(schema, undefined)).toEqual({});
  });

  it("keeps top-level strings for a schema without field meta", () => {
    const legacy = z.object({ size: z.number(), title: z.string() });
    expect(
      flattenTranslations(legacy, { size: 4, tags: ["a"], title: "مرحبا" })
    ).toEqual({ title: "مرحبا" });
  });
});

describe("resolveLocaleLayers", () => {
  it("lays overrides over the locale file over the base values", () => {
    const result = resolveLocaleLayers(schema, base, {
      overrides: { "stats.1.label": "فرق", title: "أهلا" },
      translations: {
        cta: { label: "ابدأ" },
        stats: [{ label: "المستخدمون" }, { label: "الفرق" }],
        title: "مرحبا",
      },
    });

    expect(result.title).toBe("أهلا");
    expect(result.cta).toEqual({ label: "ابدأ", url: "https://x.dev" });
    expect(result.stats).toEqual([
      { label: "المستخدمون", value: 10 },
      { label: "فرق", value: 2 },
    ]);
  });

  it("never lets an override touch a value that is not translatable text", () => {
    const result = resolveLocaleLayers(schema, base, {
      overrides: { accent: "#000000", "cta.url": "https://evil.example" },
    });
    expect(result.accent).toBe("#ff6a3d");
    expect(result.cta).toEqual({ label: "Start", url: "https://x.dev" });
  });

  it("never changes a list's length", () => {
    const result = resolveLocaleLayers(schema, base, {
      overrides: { "tags.5": "x" },
    });
    expect(result.tags).toEqual(["a", "b"]);
  });

  it("returns the base values when there are no layers", () => {
    expect(resolveLocaleLayers(schema, base, {})).toEqual(base);
  });

  it("applies only top-level string overrides to a schema without field meta", () => {
    const legacy = z.object({ tags: z.array(z.string()), title: z.string() });
    const result = resolveLocaleLayers(
      legacy,
      { tags: ["a", "b"], title: "Hi" },
      { overrides: { "tags.0": "x", title: "مرحبا" } }
    );
    expect(result).toEqual({ tags: ["a", "b"], title: "مرحبا" });
  });
});
