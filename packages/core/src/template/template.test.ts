import { describe, expect, it } from "bun:test";

import { createElement } from "react";
import type { ReactElement } from "react";
import { z } from "zod";

import { classifyLocale } from "../shared/locale.js";
import { zodToJsonSchemaShape } from "../shared/validation.js";
import {
  defineTemplate,
  isTemplateDefinition,
  toTemplateDefinition,
} from "./define-template.js";
import { field } from "./field.js";
import { declaredFontConfigs, fontStack } from "./fonts.js";
import { createRenderContext, toCanvas } from "./render-context.js";
import type { RenderContext } from "./render-context.js";

const ctxFor = (
  localeId: string | undefined,
  canvas = toCanvas(100, 100)
): RenderContext =>
  createRenderContext<string>({
    canvas,
    fonts: {},
    locale: classifyLocale(localeId),
  });

const latinCtx = ctxFor("en", toCanvas(1200, 630));

const Legacy = (props: Record<string, unknown>) =>
  createElement("div", null, String(props.locale));

const propsOf = (element: ReactElement): Record<string, unknown> =>
  element.props as Record<string, unknown>;

describe("defineTemplate", () => {
  const poster = defineTemplate({
    render: (props) => createElement("div", null, props.title),
    schema: {
      accent: field.color("#ff6a3d"),
      title: field.text("Hello"),
    },
  });

  it("brands the definition and fills defaults through its schema", () => {
    expect(isTemplateDefinition(poster)).toBe(true);
    expect(poster.legacy).toBe(false);
    expect(poster.propsSchema.parse({})).toEqual({
      accent: "#ff6a3d",
      title: "Hello",
    });
  });

  it("refuses a schema that declares a prop the pipeline owns", () => {
    expect(() =>
      defineTemplate({
        render: () => createElement("div"),
        // @ts-expect-error locale arrives as ctx, never as a prop
        schema: { locale: field.text("en") },
      })
    ).toThrow("which the pipeline provides as ctx");
  });

  it("passes the render context to render", () => {
    const seen: string[] = [];
    const probe = defineTemplate({
      render: (_props, ctx) => {
        seen.push(ctx.dir, ctx.canvas.aspect);
        return createElement("div");
      },
      schema: {},
    });
    probe.render({}, latinCtx);
    expect(seen).toEqual(["ltr", "landscape"]);
  });
});

describe("toTemplateDefinition", () => {
  const propsSchema = z.object({ title: z.string().default("x") });

  it("returns a defineTemplate default export as is", () => {
    const definition = defineTemplate({
      render: () => createElement("div"),
      schema: {},
    });
    expect(toTemplateDefinition({ default: definition }, "t")).toBe(definition);
  });

  it("wraps a legacy module and injects the locale prop until 1.0", () => {
    const definition = toTemplateDefinition(
      { default: Legacy, propsSchema },
      "legacy"
    );
    expect(definition.legacy).toBe(true);

    const arabic = ctxFor("ar");
    expect(propsOf(definition.render({ title: "x" }, arabic)).locale).toBe(
      "ar"
    );
    expect(
      "locale" in propsOf(definition.render({ title: "x" }, latinCtx))
    ).toBe(true);

    const noLocale = ctxFor(undefined);
    expect(
      "locale" in propsOf(definition.render({ title: "x" }, noLocale))
    ).toBe(false);
  });

  it("names what is missing", () => {
    expect(() => toTemplateDefinition({}, "t")).toThrow(
      "must have a default export"
    );
    expect(() => toTemplateDefinition({ default: Legacy }, "t")).toThrow(
      'must export a "propsSchema"'
    );
  });
});

describe("field", () => {
  const schema = z.object({
    accent: field.color("#000", { description: "Accent" }),
    count: field.number(3, { integer: true, max: 9, min: 1 }),
    layout: field.select(["grid", "stack"], "grid"),
    stats: field.list(
      z.object({ label: field.text("Users"), value: field.text("10k") }),
      { default: [{ label: "A", value: "1" }], length: 1 }
    ),
    style: field.object({ dark: field.boolean(false) }),
    title: field.text("Hi", { description: "Headline", multiline: true }),
    url: field.text("https://x.dev", { translatable: false }),
  });

  it("records each field's kind in the JSON schema", () => {
    const json = zodToJsonSchemaShape(schema) as {
      properties: Record<string, Record<string, unknown>>;
    };
    const { properties } = json;
    expect(properties.title?.["x-field"]).toEqual({
      kind: "text",
      multiline: true,
      translatable: true,
    });
    expect(properties.title?.description).toBe("Headline");
    expect(properties.url?.["x-field"]).toMatchObject({ translatable: false });
    expect(properties.accent?.["x-field"]).toMatchObject({ kind: "color" });
    expect(properties.layout?.["x-field"]).toMatchObject({ kind: "select" });
    expect(properties.stats?.["x-field"]).toMatchObject({ kind: "list" });
    expect(properties.style?.["x-field"]).toMatchObject({ kind: "object" });
  });

  it("enforces its limits in the schema", () => {
    expect(schema.safeParse({ accent: "orange" }).success).toBe(false);
    expect(schema.safeParse({ count: 2.5 }).success).toBe(false);
    expect(schema.safeParse({ stats: [] }).success).toBe(false);
    expect(schema.parse({}).style).toEqual({ dark: false });
  });
});

describe("fonts", () => {
  const roles = {
    body: { faces: ["Inter", { family: "Noto Sans Arabic", weights: [400] }] },
    display: {
      faces: [{ family: "Inter", weights: [800, 400] }],
      generic: "serif" as const,
    },
  };

  it("builds the CSS stack in face order, generic last", () => {
    expect(fontStack(roles.body)).toBe("Inter, Noto Sans Arabic, sans-serif");
    expect(fontStack(roles.display)).toBe("Inter, serif");
  });

  it("merges weights per family across roles", () => {
    expect(declaredFontConfigs(roles)).toEqual([
      { family: "Inter", source: "google", weights: [400, 800] },
      { family: "Noto Sans Arabic", source: "google", weights: [400] },
    ]);
  });
});

describe("createRenderContext", () => {
  it("classifies the canvas aspect", () => {
    expect(toCanvas(1080, 1080).aspect).toBe("square");
    expect(toCanvas(1080, 1920).aspect).toBe("portrait");
    expect(toCanvas(1200, 630).aspect).toBe("landscape");
  });

  it("flips horizontal values only for right-to-left renders", () => {
    const rtl = ctxFor("he");
    expect(rtl.flip(12)).toBe(-12);
    expect(rtl.flip(0)).toBe(0);
    expect(latinCtx.flip(12)).toBe(12);
  });

  it("adapts a Latin text style to the script", () => {
    const spec = {
      font: "display",
      italic: true,
      leading: 0.9,
      size: 100,
      tracking: -0.04,
      uppercase: true,
    } as const;
    const fonts = { display: { faces: ["Anton"] } };
    const latin = createRenderContext({
      canvas: toCanvas(100, 100),
      fonts,
      locale: classifyLocale("en"),
    });
    const arabic = createRenderContext({
      canvas: toCanvas(100, 100),
      fonts,
      locale: classifyLocale("ar"),
    });

    expect(latin.type(spec)).toEqual({
      fontFamily: "Anton, sans-serif",
      fontSize: 100,
      fontStyle: "italic",
      letterSpacing: "-0.04em",
      lineHeight: 0.9,
      textTransform: "uppercase",
    });
    expect(arabic.type(spec)).toEqual({
      fontFamily: "Anton, sans-serif",
      fontSize: 88,
      lineHeight: 1.15,
    });
  });

  it("uses a per-script size and leading exactly as given", () => {
    const spec = {
      leading: 0.95,
      scripts: { arabic: { leading: 1, size: 100 } },
      size: 132,
    };
    expect(ctxFor("ar").type(spec)).toEqual({ fontSize: 100, lineHeight: 1 });
    expect(ctxFor("he").type(spec)).toEqual({
      fontSize: 124,
      lineHeight: 1.05,
    });
    expect(ctxFor("en").type(spec)).toEqual({
      fontSize: 132,
      lineHeight: 0.95,
    });
  });

  it("leaves the size alone when the spec has none", () => {
    expect(ctxFor("ar").type({ tracking: 0.2 })).toEqual({});
    expect(ctxFor("en").type({ tracking: 0.2 })).toEqual({
      letterSpacing: "0.2em",
    });
  });
});

const renderEmpty = () => createElement("div");

describe("inspector and field labels", () => {
  const schema = {
    accent: field.color("#fff", { label: "Accent colour" }),
    headline: field.text("Hi"),
    size: field.number(1),
  };
  it("keeps the declared layout on the definition", () => {
    const template = defineTemplate({
      inspector: [
        ["Content", ["headline"]],
        ["Style", ["accent", "size"]],
      ],
      render: renderEmpty,
      schema,
    });
    expect(template.inspector).toEqual([
      ["Content", ["headline"]],
      ["Style", ["accent", "size"]],
    ]);
  });

  it("leaves inspector undefined when the template declares none", () => {
    expect(
      defineTemplate({ render: renderEmpty, schema }).inspector
    ).toBeUndefined();
  });

  it("rejects an unknown or repeated key at type level and at run time", () => {
    expect(() =>
      defineTemplate({
        // @ts-expect-error "missing" is not a schema key
        inspector: [["Content", ["missing"]]],
        render: renderEmpty,
        schema,
      })
    ).toThrow(/not in the schema/u);

    expect(() =>
      defineTemplate({
        // @ts-expect-error "headline" is named twice
        inspector: [
          ["Content", ["headline"]],
          ["More", ["headline"]],
        ],
        render: renderEmpty,
        schema,
      })
    ).toThrow(/more than once/u);
  });

  it("sends a field's label through x-field", () => {
    const shape = zodToJsonSchemaShape(
      defineTemplate({ render: renderEmpty, schema }).propsSchema
    );
    const properties = shape.properties as Record<
      string,
      Record<string, unknown>
    >;
    expect(properties.accent?.["x-field"]).toMatchObject({
      kind: "color",
      label: "Accent colour",
    });
    expect(properties.headline?.["x-field"]).not.toHaveProperty("label", "x");
  });
});
