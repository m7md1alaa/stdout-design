import { describe, expect, it } from "bun:test";

import { classifyLocale } from "../shared/locale.js";
import { Arrow, halftone, keyed, starburst, words } from "./kit.js";
import { createRenderContext, toCanvas } from "./render-context.js";

const ctxFor = (localeId: string) =>
  createRenderContext<string>({
    canvas: toCanvas(100, 100),
    fonts: {},
    locale: classifyLocale(localeId),
  });

const arrowTransform = (localeId: string) =>
  (
    Arrow({ color: "#000", ctx: ctxFor(localeId) }).props as {
      style: { transform: string };
    }
  ).style.transform;

describe("authoring kit", () => {
  it("keys repeated items uniquely and keeps their order", () => {
    expect(keyed(["a", "b", "a", "a"])).toEqual([
      { index: 0, key: "a", value: "a" },
      { index: 1, key: "b", value: "b" },
      { index: 2, key: "a#2", value: "a" },
      { index: 3, key: "a#3", value: "a" },
    ]);
    expect(
      keyed([{ id: "x" }, { id: "x" }], (item) => item.id).map((k) => k.key)
    ).toEqual(["x", "x#2"]);
  });

  it("splits words on any whitespace", () => {
    expect(words("  Wear  It\nLoud ")).toEqual(["Wear", "It", "Loud"]);
  });

  it("draws a starburst with alternating radii", () => {
    const points = starburst(4, 50, 25).split(" ");
    expect(points).toHaveLength(8);
    expect(points[0]).toBe("50,0");
  });

  it("builds a dot screen background", () => {
    expect(halftone({ color: "#000", spacing: 18 })).toEqual({
      backgroundImage: "radial-gradient(#000 30%, transparent 32%)",
      backgroundSize: "18px 18px",
    });
  });

  it("mirrors the arrow for right-to-left renders", () => {
    expect(arrowTransform("en")).toBe("scaleX(1)");
    expect(arrowTransform("ar")).toBe("scaleX(-1)");
  });
});
