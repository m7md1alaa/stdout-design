import { describe, expect, test } from "bun:test";

import { mergeDefaultProps, parsePropArgs } from "../prop-parser.js";
import type { JsonSchemaShape } from "../prop-parser.js";

describe("parsePropArgs", () => {
  test("flag-style arg without = sets value to true", () => {
    const result = parsePropArgs(["--verbose"], { properties: {} });
    expect(result).toEqual({ "--verbose": true });
  });

  test("coerces number type", () => {
    const schema: JsonSchemaShape = {
      properties: { count: { type: "number" } },
    };
    expect(parsePropArgs(["count=42"], schema)).toEqual({ count: 42 });
    expect(parsePropArgs(["count=3.14"], schema)).toEqual({ count: 3.14 });
    expect(parsePropArgs(["count=0"], schema)).toEqual({ count: 0 });
  });

  test("passes number value through when NaN", () => {
    const schema: JsonSchemaShape = {
      properties: { count: { type: "number" } },
    };
    const result = parsePropArgs(["count=--port"], schema);
    expect(result).toEqual({ count: "--port" });
  });

  test("coerces boolean type", () => {
    const schema: JsonSchemaShape = {
      properties: { active: { type: "boolean" } },
    };
    expect(parsePropArgs(["active=true"], schema)).toEqual({ active: true });
    expect(parsePropArgs(["active=1"], schema)).toEqual({ active: true });
    expect(parsePropArgs(["active=false"], schema)).toEqual({ active: false });
    expect(parsePropArgs(["active=0"], schema)).toEqual({ active: false });
  });

  test("passes boolean value through when no match", () => {
    const schema: JsonSchemaShape = {
      properties: { active: { type: "boolean" } },
    };
    expect(parsePropArgs(["active=yes"], schema)).toEqual({ active: "yes" });
    expect(parsePropArgs(["active="], schema)).toEqual({ active: "" });
  });

  test("coerces array type from JSON", () => {
    const schema: JsonSchemaShape = {
      properties: { tags: { items: { type: "string" }, type: "array" } },
    };
    const result = parsePropArgs(['tags=["a","b"]'], schema);
    expect(result).toEqual({ tags: ["a", "b"] });
  });

  test("coerces array type from comma-separated string", () => {
    const schema: JsonSchemaShape = {
      properties: { tags: { type: "array" } },
    };
    const result = parsePropArgs(["tags=a,b,c"], schema);
    expect(result).toEqual({ tags: ["a", "b", "c"] });
  });

  test("falls back to comma-split when JSON parse fails", () => {
    const schema: JsonSchemaShape = {
      properties: { tags: { type: "array" } },
    };
    const result = parsePropArgs(["tags=[a,b]"], schema);
    expect(result).toEqual({ tags: ["[a", "b]"] });
  });

  test("splits single array value into single-element array", () => {
    const schema: JsonSchemaShape = {
      properties: { tags: { type: "array" } },
    };
    const result = parsePropArgs(["tags=x"], schema);
    expect(result).toEqual({ tags: ["x"] });
  });

  test("handles empty array value", () => {
    const schema: JsonSchemaShape = {
      properties: { tags: { type: "array" } },
    };
    const result = parsePropArgs(["tags="], schema);
    expect(result).toEqual({ tags: [""] });
  });

  test("passes unknown keys through as strings", () => {
    const schema: JsonSchemaShape = { properties: {} };
    const result = parsePropArgs(["custom=hello"], schema);
    expect(result).toEqual({ custom: "hello" });
  });

  test("coerces multiple args with different types", () => {
    const schema: JsonSchemaShape = {
      properties: {
        active: { type: "boolean" },
        count: { type: "number" },
        name: { type: "string" },
        tags: { type: "array" },
      },
    };
    const result = parsePropArgs(
      ["count=5", "active=true", "tags=x,y", "name=test"],
      schema
    );
    expect(result).toEqual({
      active: true,
      count: 5,
      name: "test",
      tags: ["x", "y"],
    });
  });

  test("returns empty object for no args", () => {
    const result = parsePropArgs([], { properties: {} });
    expect(result).toEqual({});
  });
});

describe("mergeDefaultProps", () => {
  test("includes defaults from schema", () => {
    const schema: JsonSchemaShape = {
      properties: {
        color: { default: "red", type: "string" },
        size: { default: 12, type: "number" },
      },
    };
    const result = mergeDefaultProps(schema, {});
    expect(result).toEqual({ color: "red", size: 12 });
  });

  test("props override defaults", () => {
    const schema: JsonSchemaShape = {
      properties: {
        color: { default: "red", type: "string" },
      },
    };
    const result = mergeDefaultProps(schema, { color: "blue" });
    expect(result).toEqual({ color: "blue" });
  });

  test("props without schema defaults pass through", () => {
    const schema: JsonSchemaShape = {
      properties: {
        name: { type: "string" },
      },
    };
    const result = mergeDefaultProps(schema, { name: "test" });
    expect(result).toEqual({ name: "test" });
  });

  test("partial defaults merge correctly", () => {
    const schema: JsonSchemaShape = {
      properties: {
        a: { default: 1, type: "number" },
        b: { type: "string" },
      },
    };
    const result = mergeDefaultProps(schema, { b: "x" });
    expect(result).toEqual({ a: 1, b: "x" });
  });

  test("allows prop override with falsy value", () => {
    const schema: JsonSchemaShape = {
      properties: {
        count: { default: 10, type: "number" },
      },
    };
    const result = mergeDefaultProps(schema, { count: 0 });
    expect(result).toEqual({ count: 0 });
  });

  test("returns empty object when schema has no properties", () => {
    const result = mergeDefaultProps({ properties: {} }, { a: 1 });
    expect(result).toEqual({ a: 1 });
  });
});
