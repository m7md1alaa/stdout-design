import { describe, expect, it } from "bun:test";

import { fieldHint, labelFromKey } from "./field-label";

describe("labelFromKey", () => {
  it("turns camelCase keys into sentence case", () => {
    expect(labelFromKey("accentColor")).toBe("Accent color");
    expect(labelFromKey("metricValue")).toBe("Metric value");
    expect(labelFromKey("headline")).toBe("Headline");
  });

  it("splits snake_case and kebab-case keys", () => {
    expect(labelFromKey("gauge_label")).toBe("Gauge label");
    expect(labelFromKey("cta-text")).toBe("Cta text");
  });

  it("keeps acronyms in capitals", () => {
    expect(labelFromKey("ctaURL")).toBe("Cta URL");
    expect(labelFromKey("URLPath")).toBe("URL path");
    expect(labelFromKey("ogImage")).toBe("Og image");
  });

  it("labels a dotted path by its last segment", () => {
    expect(labelFromKey("receipt.0.item")).toBe("Item");
    expect(labelFromKey("title.fontSize")).toBe("Font size");
  });

  it("falls back to the path when the key has no words", () => {
    expect(labelFromKey("")).toBe("");
    expect(labelFromKey("___")).toBe("___");
  });
});

describe("fieldHint", () => {
  it("returns the description when it adds information", () => {
    expect(fieldHint("Accent color", "Accent for the solid tiles")).toBe(
      "Accent for the solid tiles"
    );
  });

  it("drops a description that only repeats the label", () => {
    expect(fieldHint("Item", "item")).toBeUndefined();
    expect(fieldHint("Item", "  Item ")).toBeUndefined();
  });

  it("ignores a missing or non-string description", () => {
    expect(fieldHint("Item", undefined)).toBeUndefined();
    expect(fieldHint("Item", 3)).toBeUndefined();
    expect(fieldHint("Item", "   ")).toBeUndefined();
  });
});
