import { describe, expect, it } from "bun:test";

import { classifyLocale } from "./locale.js";

describe("classifyLocale", () => {
  it.each([
    ["ar", "arabic", "rtl", "ar"],
    ["ar-EG", "arabic", "rtl", "ar"],
    ["fa", "arabic", "rtl", "fa"],
    ["ur-PK", "arabic", "rtl", "ur"],
    ["he", "hebrew", "rtl", "he"],
    ["yi", "hebrew", "rtl", "yi"],
    ["en", "latin", "ltr", undefined],
    ["fr-CA", "latin", "ltr", undefined],
  ] as const)("%s is %s, %s", (id, script, dir, lang) => {
    expect(classifyLocale(id)).toEqual({ dir, id, lang, script });
  });

  it("reads case-insensitively and accepts ISO 639-2 codes", () => {
    expect(classifyLocale("AR").script).toBe("arabic");
    expect(classifyLocale("ara").script).toBe("arabic");
  });

  it("lets an explicit script subtag win over the language", () => {
    expect(classifyLocale("az-Arab").script).toBe("arabic");
    expect(classifyLocale("ku-Latn").dir).toBe("ltr");
  });

  it("treats the no-locale render and unparseable ids as Latin", () => {
    expect(classifyLocale(undefined)).toEqual({
      dir: "ltr",
      id: "default",
      lang: undefined,
      script: "latin",
    });
    expect(classifyLocale("not a locale!").script).toBe("latin");
  });
});
