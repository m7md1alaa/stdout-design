import { describe, expect, it } from "bun:test";

import { z } from "zod";

import { field } from "../template/field.js";
import { applyTranslations } from "./translations.js";

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

const props = schema.parse({});

describe("applyTranslations with field meta", () => {
  it("replaces translatable text at any depth and nothing else", () => {
    const result = applyTranslations(schema, props, {
      accent: "#000000",
      cta: { label: "ابدأ", url: "https://evil.example" },
      stats: [{ label: "المستخدمون", value: 999 }],
      tags: ["أ", "ب"],
      title: "مرحبا",
    });

    expect(result).toEqual({
      accent: "#ff6a3d",
      cta: { label: "ابدأ", url: "https://x.dev" },
      stats: [
        { label: "المستخدمون", value: 10 },
        { label: "Teams", value: 2 },
      ],
      tags: ["أ", "ب"],
      title: "مرحبا",
    });
  });

  it("never changes a list's length", () => {
    const result = applyTranslations(schema, props, {
      tags: ["one", "two", "three"],
    });
    expect(result.tags).toEqual(["one", "two"]);
  });

  it("ignores keys the schema does not declare and values of the wrong type", () => {
    const result = applyTranslations(schema, props, {
      stray: "x",
      title: 42,
    });
    expect(result).toEqual(props);
  });
});

describe("applyTranslations without field meta", () => {
  const legacy = z.object({
    color: z.string().default("#fff"),
    items: z.array(z.string()).default(["a"]),
    title: z.string().default("Hi"),
  });

  it("keeps the by-value rule: strings over strings, arrays over arrays", () => {
    const result = applyTranslations(
      legacy,
      { color: "#fff", items: ["a"], title: "Hi" },
      { color: "#000", items: ["b", "c"], title: 3 }
    );
    expect(result).toEqual({ color: "#000", items: ["b", "c"], title: "Hi" });
  });

  it("works with no schema and no translations", () => {
    expect(applyTranslations(undefined, { a: "x" }, { a: "y" })).toEqual({
      a: "y",
    });
    expect(applyTranslations(legacy, { a: "x" }, undefined)).toEqual({
      a: "x",
    });
  });
});
