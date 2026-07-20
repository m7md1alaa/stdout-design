import { describe, expect, it } from "bun:test";

import { mergeLocaleProps } from "./merge-locale-props.js";

describe("mergeLocaleProps", () => {
  it("returns props unchanged when localeData is undefined", () => {
    const props = { count: 42, title: "Hello" };
    const result = mergeLocaleProps(props);
    expect(result).toEqual(props);
    expect(result).not.toBe(props);
  });

  it("overrides only matching-type values from localeData into existing props", () => {
    const props = {
      items: ["a", "b"],
      subtitle: "",
      tags: [1, 2],
      title: "Hello",
    };
    const localeData = {
      items: ["x", "y", "z"],
      subtitle: "Bonjour",
      title: 123,
    };

    const result = mergeLocaleProps(props, localeData);

    expect(result.items).toEqual(["x", "y", "z"]);
    expect(result.subtitle).toBe("Bonjour");
    expect(result.title).toBe("Hello");
    expect(result.tags).toEqual([1, 2]);
  });

  it("does not introduce new keys from localeData", () => {
    const props = { title: "Hello" };
    const localeData = { description: "Extra", title: "Bonjour" };

    const result = mergeLocaleProps(props, localeData);

    expect(result.title).toBe("Bonjour");
    expect(result).not.toHaveProperty("description");
  });

  it("does not override when types mismatch", () => {
    const props = { count: 42, name: "Alice" };
    const localeData = { count: "forty-two", name: 99 };

    const result = mergeLocaleProps(props, localeData);

    expect(result.count).toBe(42);
    expect(result.name).toBe("Alice");
  });
});
