import { describe, expect, it } from "bun:test";

import { resolveLocale } from "./utils";
import type { LocaleSummary } from "./utils";

const LOCALES: LocaleSummary[] = [
  { dir: "ltr", id: "en", script: "latin" },
  { dir: "rtl", id: "fa", script: "arabic" },
  { dir: "rtl", id: "he-IL", script: "hebrew" },
];

describe("resolveLocale", () => {
  it("keeps an explicitly selected locale", () => {
    expect(resolveLocale("en", { title: "مرحبا" }, LOCALES)).toEqual({
      autoDetected: false,
      locale: "en",
    });
  });

  it("picks the configured locale whose script matches typed text", () => {
    expect(resolveLocale(null, { items: ["سلام"] }, LOCALES)).toEqual({
      autoDetected: true,
      locale: "fa",
    });
    expect(resolveLocale(null, { nested: { title: "שלום" } }, LOCALES)).toEqual(
      { autoDetected: true, locale: "he-IL" }
    );
  });

  it("falls back to the script's own locale when none is configured", () => {
    expect(resolveLocale(null, { title: "مرحبا" }, [])).toEqual({
      autoDetected: true,
      locale: "ar",
    });
  });

  it("leaves Latin text on the default render", () => {
    expect(resolveLocale(null, { title: "Hello" }, LOCALES)).toEqual({
      autoDetected: false,
      locale: null,
    });
  });
});
