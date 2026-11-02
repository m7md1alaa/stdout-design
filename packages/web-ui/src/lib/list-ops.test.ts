import { describe, expect, it } from "bun:test";

import {
  duplicateItem,
  indexAfterMove,
  moveItem,
  removeItem,
  summarizeItem,
} from "./list-ops";

describe("moveItem", () => {
  it("moves an item forward and backward", () => {
    expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });

  it("ignores out-of-range moves without mutating the input", () => {
    const input = ["a", "b"];
    expect(moveItem(input, 0, 5)).toEqual(["a", "b"]);
    expect(moveItem(input, -1, 0)).toEqual(["a", "b"]);
    expect(input).toEqual(["a", "b"]);
  });
});

describe("duplicateItem and removeItem", () => {
  it("copies an item right after itself, deeply", () => {
    const original = { name: "a", tags: ["x"] };
    const items = [original];
    const next = duplicateItem(items, 0);
    expect(next).toEqual([original, original]);
    expect(next[1]).not.toBe(original);
  });

  it("removes by index", () => {
    expect(removeItem(["a", "b", "c"], 1)).toEqual(["a", "c"]);
  });
});

describe("indexAfterMove", () => {
  it("follows the moved row", () => {
    expect(indexAfterMove(1, 1, 3)).toBe(3);
  });

  it("shifts rows the move passes over", () => {
    expect(indexAfterMove(2, 0, 3)).toBe(1);
    expect(indexAfterMove(1, 3, 0)).toBe(2);
  });

  it("leaves rows outside the move alone", () => {
    expect(indexAfterMove(5, 0, 3)).toBe(5);
  });
});

describe("summarizeItem", () => {
  it("joins the first two text or number values", () => {
    expect(summarizeItem({ item: "Coffee", note: "x", price: "4.50" }, 0)).toBe(
      "Coffee · x"
    );
    expect(summarizeItem({ item: "Coffee", price: 4.5 }, 0)).toBe(
      "Coffee · 4.5"
    );
  });

  it("skips empty values, colors and booleans", () => {
    expect(summarizeItem({ a: "", b: "#fff", c: true, d: "Hi" }, 0)).toBe("Hi");
  });

  it("falls back to the position", () => {
    expect(summarizeItem({ a: "" }, 2)).toBe("Item 3");
  });
});
