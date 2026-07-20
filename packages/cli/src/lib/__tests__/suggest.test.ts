import { describe, expect, test } from "bun:test";

import { suggestClosest } from "../suggest.js";

describe("suggestClosest", () => {
  test("returns exact match when input matches a candidate", () => {
    const result = suggestClosest("hello", ["hello", "world"]);
    expect(result).toBe("hello");
  });

  test("returns undefined for empty candidate list", () => {
    const result = suggestClosest("hello", []);
    expect(result).toBeUndefined();
  });

  test("returns undefined when input is empty and candidates are non-empty", () => {
    const result = suggestClosest("", ["hello"]);
    expect(result).toBeUndefined();
  });

  test("returns candidate within max distance", () => {
    const result = suggestClosest("helo", ["hello", "world"]);
    expect(result).toBe("hello");
  });

  test("returns undefined when all candidates exceed maxDistance", () => {
    const result = suggestClosest("abcdef", ["hello", "world"]);
    expect(result).toBeUndefined();
  });

  test("respects custom maxDistance", () => {
    const candidates = ["hello"];
    expect(suggestClosest("hxxxx", candidates, 1)).toBeUndefined();
    expect(suggestClosest("hxxxx", candidates, 4)).toBe("hello");
  });

  test("is case insensitive", () => {
    const result = suggestClosest("HELLO", ["hello", "world"]);
    expect(result).toBe("hello");
  });

  test("is case insensitive for both input and candidates", () => {
    const result = suggestClosest("hello", ["HELLO"]);
    expect(result).toBe("HELLO");
  });

  test("returns first candidate on tie", () => {
    const result = suggestClosest("helo", ["hElo", "hEl0"]);
    expect(result).toBe("hElo");
  });

  test("distance of exactly maxDistance still matches", () => {
    const result = suggestClosest("abc", ["abx"], 1);
    expect(result).toBe("abx");
  });

  test("handles single-character strings", () => {
    expect(suggestClosest("a", ["a"])).toBe("a");
    expect(suggestClosest("a", ["b"])).toBe("b");
    expect(suggestClosest("a", ["c"], 0)).toBeUndefined();
  });

  test("handles empty input with empty candidates", () => {
    const result = suggestClosest("", []);
    expect(result).toBeUndefined();
  });
});
