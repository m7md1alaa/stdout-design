import { describe, it, expect } from "bun:test";

import { z } from "zod";

import type { PropValidationIssue } from "../shared/validation.js";
import {
  defineSchema,
  validateProps,
  PropValidationError,
} from "../shared/validation.js";

const asPropValidationError = (
  error: unknown
): { issues: PropValidationIssue[] } => {
  if (!(error instanceof PropValidationError)) {
    throw new Error("Expected PropValidationError");
  }
  return error;
};

describe("defineSchema", () => {
  it("returns the schema unchanged", () => {
    const schema = z.object({ name: z.string() });
    expect(defineSchema(schema)).toBe(schema);
  });
});

describe("PropValidationError", () => {
  it("sets the name and issues", () => {
    const issues = [
      {
        expected: "string",
        field: "title",
        message: "Expected string, received number",
        received: "number",
      },
    ];
    const error = new PropValidationError(issues);

    expect(error.name).toBe("PropValidationError");
    expect(error.issues).toEqual(issues);
    expect(error.message).toBe(
      "Invalid props: title - Expected string, received number"
    );
  });

  it("formats multiple issues", () => {
    const issues = [
      {
        expected: "string",
        field: "title",
        message: "Required",
        received: "undefined",
      },
      {
        expected: "number",
        field: "count",
        message: "Required",
        received: "undefined",
      },
    ];
    const error = new PropValidationError(issues);

    expect(error.message).toBe(
      "Invalid props: title - Required; count - Required"
    );
  });

  it("handles empty issues", () => {
    const error = new PropValidationError([]);
    expect(error.message).toBe("Invalid props: ");
    expect(error.issues).toEqual([]);
  });
});

describe("validateProps", () => {
  it("returns parsed data for valid props", () => {
    const schema = z.object({ age: z.number(), name: z.string() });
    const result = validateProps(schema, { age: 30, name: "Alice" });
    expect(result).toEqual({ age: 30, name: "Alice" });
  });

  it("applies default values", () => {
    const schema = z.object({
      title: z.string().default("Hello"),
    });
    const result = validateProps(schema, {});
    expect(result).toEqual({ title: "Hello" });
  });

  it("coerces values when schema allows", () => {
    const schema = z.object({ count: z.coerce.number() });
    const result = validateProps(schema, { count: "42" });
    expect(result).toEqual({ count: 42 });
  });

  it("throws PropValidationError for invalid props", () => {
    const schema = z.object({ name: z.string() });
    try {
      validateProps(schema, { name: 42 });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(PropValidationError);
      const { issues } = asPropValidationError(error);
      expect(issues).toHaveLength(1);
      expect(issues[0]?.field).toBe("name");
    }
  });

  it("throws for missing required field", () => {
    const schema = z.object({ name: z.string() });
    try {
      validateProps(schema, {});
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(PropValidationError);
      const { issues } = asPropValidationError(error);
      const [issue] = issues;
      expect(issue?.field).toBe("name");
      expect(issue?.message).toMatch(/required|expected string/iu);
    }
  });

  it("handles nested path in issues", () => {
    const schema = z.object({
      address: z.object({ city: z.string() }),
    });
    try {
      validateProps(schema, { address: { city: 42 } });
      expect.unreachable();
    } catch (error) {
      const { issues } = asPropValidationError(error);
      expect(issues[0]?.field).toBe("address.city");
    }
  });

  it("handles deeply nested paths", () => {
    const schema = z.object({
      a: z.object({ b: z.object({ c: z.boolean() }) }),
    });
    try {
      validateProps(schema, { a: { b: { c: "not-boolean" } } });
      expect.unreachable();
    } catch (error) {
      const { issues } = asPropValidationError(error);
      expect(issues[0]?.field).toBe("a.b.c");
    }
  });

  it("reports multiple validation errors", () => {
    const schema = z.object({
      age: z.number(),
      name: z.string(),
    });
    try {
      validateProps(schema, { age: "old", name: 42 });
      expect.unreachable();
    } catch (error) {
      const { issues } = asPropValidationError(error);
      expect(issues.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("handles empty object schema", () => {
    const schema = z.object({});
    const result = validateProps(schema, {});
    expect(result).toEqual({});
  });

  it("strips unknown properties", () => {
    const schema = z.object({ name: z.string() });
    const result = validateProps(schema, {
      extra: "should be stripped",
      name: "Alice",
    });
    expect(result).toEqual({ name: "Alice" });
    expect("extra" in result).toBe(false);
  });

  it("handles union types", () => {
    const schema = z.object({ value: z.union([z.string(), z.number()]) });
    expect(validateProps(schema, { value: "hi" })).toEqual({ value: "hi" });
    expect(validateProps(schema, { value: 42 })).toEqual({ value: 42 });
    try {
      validateProps(schema, { value: true });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(PropValidationError);
    }
  });

  it("handles optional fields", () => {
    const schema = z.object({ name: z.string().optional() });
    expect(validateProps(schema, {})).toEqual({});
    expect(validateProps(schema, { name: "Alice" })).toEqual({ name: "Alice" });
  });

  it("handles nullable fields", () => {
    const schema = z.object({ name: z.string().nullable() });
    expect(validateProps(schema, { name: null })).toEqual({ name: null });
    try {
      validateProps(schema, { name: 42 });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(PropValidationError);
    }
  });

  it("handles enum fields", () => {
    const schema = z.object({ role: z.enum(["admin", "user"]) });
    expect(validateProps(schema, { role: "admin" })).toEqual({ role: "admin" });
    try {
      validateProps(schema, { role: "superadmin" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(PropValidationError);
    }
  });
});
