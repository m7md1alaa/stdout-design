import { describe, it, expect } from "bun:test";

import { z } from "zod";

import type { TemplateModule } from "../shared/types.js";
import { isZodObject, zodToJsonSchemaShape } from "../shared/validation.js";

describe("isZodObject", () => {
  it("returns true for a plain ZodObject", () => {
    const schema = z.object({ name: z.string() });
    expect(isZodObject(schema)).toBe(true);
  });

  it("returns true for a ZodObject with defaults", () => {
    const schema = z.object({ title: z.string().default("Hello") });
    expect(isZodObject(schema)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isZodObject(null)).toBe(false);
  });

  it("returns false for a bare ZodString", () => {
    expect(isZodObject(z.string())).toBe(false);
  });

  it("returns false for a plain object without parse/shape", () => {
    expect(isZodObject({})).toBe(false);
  });
});

describe("zodToJsonSchemaShape", () => {
  const SCHEMA_URI = "https://json-schema.org/draft/2020-12/schema";

  it("converts a string field", () => {
    const schema = z.object({ name: z.string() });
    const result = zodToJsonSchemaShape(schema);

    expect(result).toEqual({
      $schema: SCHEMA_URI,
      additionalProperties: false,
      properties: {
        name: { type: "string" },
      },
      required: ["name"],
      type: "object",
    });
  });

  it("converts a number field", () => {
    const schema = z.object({ age: z.number() });
    const result = zodToJsonSchemaShape(schema);

    expect(result).toEqual({
      $schema: SCHEMA_URI,
      additionalProperties: false,
      properties: {
        age: { type: "number" },
      },
      required: ["age"],
      type: "object",
    });
  });

  it("converts a boolean field", () => {
    const schema = z.object({ active: z.boolean() });
    const result = zodToJsonSchemaShape(schema);

    expect(result).toEqual({
      $schema: SCHEMA_URI,
      additionalProperties: false,
      properties: {
        active: { type: "boolean" },
      },
      required: ["active"],
      type: "object",
    });
  });

  it("converts an array field with element type", () => {
    const schema = z.object({ tags: z.array(z.string()) });
    const result = zodToJsonSchemaShape(schema);

    expect(result).toEqual({
      $schema: SCHEMA_URI,
      additionalProperties: false,
      properties: {
        tags: { items: { type: "string" }, type: "array" },
      },
      required: ["tags"],
      type: "object",
    });
  });

  it("extracts descriptions", () => {
    const schema = z.object({
      name: z.string().describe("The user's display name"),
    });
    const result = zodToJsonSchemaShape(schema);

    expect(result).toEqual({
      $schema: SCHEMA_URI,
      additionalProperties: false,
      properties: {
        name: {
          description: "The user's display name",
          type: "string",
        },
      },
      required: ["name"],
      type: "object",
    });
  });

  it("extracts default values", () => {
    const schema = z.object({ title: z.string().default("Hello") });
    const result = zodToJsonSchemaShape(schema);

    expect(result).toEqual({
      $schema: SCHEMA_URI,
      additionalProperties: false,
      properties: {
        title: { default: "Hello", type: "string" },
      },
      required: ["title"],
      type: "object",
    });
  });

  it("unwraps optional modifiers", () => {
    const schema = z.object({ name: z.string().optional() });
    const result = zodToJsonSchemaShape(schema);

    expect(result).toEqual({
      $schema: SCHEMA_URI,
      additionalProperties: false,
      properties: {
        name: { type: "string" },
      },
      type: "object",
    });
  });

  it("unwraps nested optional(default(...))", () => {
    const schema = z.object({
      title: z.string().optional().default("Untitled"),
    });
    const result = zodToJsonSchemaShape(schema);

    expect(result).toEqual({
      $schema: SCHEMA_URI,
      additionalProperties: false,
      properties: {
        title: { default: "Untitled", type: "string" },
      },
      required: ["title"],
      type: "object",
    });
  });

  it("returns empty properties for a schema with no shape", () => {
    const result = zodToJsonSchemaShape(z.string());

    expect(result).toEqual({});
  });

  it("handles multiple fields", () => {
    const schema = z.object({
      active: z.boolean(),
      age: z.number(),
      name: z.string(),
    });
    const result = zodToJsonSchemaShape(schema);

    expect(result).toEqual({
      $schema: SCHEMA_URI,
      additionalProperties: false,
      properties: {
        active: { type: "boolean" },
        age: { type: "number" },
        name: { type: "string" },
      },
      required: ["active", "age", "name"],
      type: "object",
    });
  });
});

describe("TemplateModule type", () => {
  it("accepts a valid module shape", () => {
    const schema = z.object({ name: z.string() });
    const module_: TemplateModule = {
      default: (_props: Record<string, unknown>) => null,
      propsSchema: schema,
    };

    expect(typeof module_.default).toBe("function");
    expect(isZodObject(module_.propsSchema)).toBe(true);
  });
});
