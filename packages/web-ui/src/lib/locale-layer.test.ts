import { describe, expect, it } from "bun:test";

import {
  applyTranslationPaths,
  isTranslatablePath,
  remapListPaths,
} from "./locale-layer";

const text = (translatable = true) => ({
  type: "string",
  "x-field": { kind: "text", translatable },
});

const schema = {
  properties: {
    background: { type: "string", "x-field": { kind: "color" } },
    categories: {
      items: text(),
      type: "array",
      "x-field": { kind: "list", translatable: false },
    },
    cta: {
      properties: { label: text(), url: text(false) },
      type: "object",
      "x-field": { kind: "object", translatable: false },
    },
    stats: {
      items: {
        properties: { label: text(), value: text(false) },
        type: "object",
      },
      type: "array",
      "x-field": { kind: "list", translatable: false },
    },
    title: text(),
  },
  type: "object",
};

describe("isTranslatablePath", () => {
  it("follows objects and list items to the field the path names", () => {
    expect(isTranslatablePath(schema, "title")).toBe(true);
    expect(isTranslatablePath(schema, "cta.label")).toBe(true);
    expect(isTranslatablePath(schema, "stats.2.label")).toBe(true);
    expect(isTranslatablePath(schema, "categories.0")).toBe(true);
  });

  it("is false for non-text, non-translatable, list and unknown paths", () => {
    expect(isTranslatablePath(schema, "background")).toBe(false);
    expect(isTranslatablePath(schema, "cta.url")).toBe(false);
    expect(isTranslatablePath(schema, "stats.0.value")).toBe(false);
    expect(isTranslatablePath(schema, "categories")).toBe(false);
    expect(isTranslatablePath(schema, "nope")).toBe(false);
    expect(isTranslatablePath(schema, "title.x")).toBe(false);
  });

  it("treats top-level strings as translatable when the schema has no field meta", () => {
    const legacy = {
      properties: {
        size: { type: "number" },
        tags: { items: { type: "string" }, type: "array" },
        title: { type: "string" },
      },
    };
    expect(isTranslatablePath(legacy, "title")).toBe(true);
    expect(isTranslatablePath(legacy, "size")).toBe(false);
    expect(isTranslatablePath(legacy, "tags.0")).toBe(false);
  });
});

describe("applyTranslationPaths", () => {
  const values = {
    background: "#fff",
    categories: ["a", "b"],
    cta: { label: "Go", url: "https://x.dev" },
    stats: [{ label: "Users", value: "10" }],
    title: "Hello",
  };

  it("replaces translatable strings that exist and leaves the rest", () => {
    expect(
      applyTranslationPaths(schema, values, {
        background: "#000",
        "categories.1": "ب",
        "categories.5": "x",
        "cta.label": "اذهب",
        "cta.url": "https://evil.example",
        "stats.0.label": "المستخدمون",
        title: "مرحبا",
      })
    ).toEqual({
      background: "#fff",
      categories: ["a", "ب"],
      cta: { label: "اذهب", url: "https://x.dev" },
      stats: [{ label: "المستخدمون", value: "10" }],
      title: "مرحبا",
    });
  });

  it("returns the same object when there is nothing to apply", () => {
    expect(applyTranslationPaths(schema, values, {})).toBe(values);
  });
});

describe("remapListPaths", () => {
  const paths = {
    "stats.0.label": "zero",
    "stats.1.label": "one",
    "stats.2.label": "two",
    title: "t",
  };

  it("moves an item's paths with it", () => {
    expect(
      remapListPaths(paths, "stats", { from: 0, kind: "move", to: 2 })
    ).toEqual({
      "stats.0.label": "one",
      "stats.1.label": "two",
      "stats.2.label": "zero",
      title: "t",
    });
  });

  it("drops a removed item's paths and shifts the ones after it", () => {
    expect(
      remapListPaths(paths, "stats", { index: 1, kind: "remove" })
    ).toEqual({
      "stats.0.label": "zero",
      "stats.1.label": "two",
      title: "t",
    });
  });

  it("shifts paths after an insert and copies a duplicated item's paths", () => {
    expect(
      remapListPaths(paths, "stats", { index: 0, item: {}, kind: "insert" })
    ).toEqual({
      "stats.1.label": "zero",
      "stats.2.label": "one",
      "stats.3.label": "two",
      title: "t",
    });
    expect(
      remapListPaths(paths, "stats", { index: 1, kind: "duplicate" })
    ).toEqual({
      "stats.0.label": "zero",
      "stats.1.label": "one",
      "stats.2.label": "one",
      "stats.3.label": "two",
      title: "t",
    });
  });

  it("leaves paths of other lists with a shared prefix alone", () => {
    expect(
      remapListPaths({ "statsExtra.0": "x" }, "stats", {
        index: 0,
        kind: "remove",
      })
    ).toEqual({ "statsExtra.0": "x" });
  });
});
