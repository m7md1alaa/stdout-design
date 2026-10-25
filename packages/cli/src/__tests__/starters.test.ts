import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const {
  orchestrateRender,
  RenderCache,
  toTemplateDefinition,
  zodToJsonSchemaShape,
} = await import("@stdout-design/core");

type TemplateDefinition = ReturnType<typeof toTemplateDefinition>;

const TEMPLATE_DIR = path.resolve(import.meta.dirname, "../../template");
const { TEMPLATE_IDS } = await import("../commands/init/scaffold.js");

const LOCALES = ["en", "ar"] as const;
const PRESETS = [
  [1080, 1080],
  [1200, 675],
] as const;

type Translations = Record<string, Record<string, unknown>>;

const readLocale = (locale: string): Translations =>
  JSON.parse(
    readFileSync(path.join(TEMPLATE_DIR, "locales", `${locale}.json`), "utf-8")
  ) as Translations;

const starters = new Map<string, TemplateDefinition>(
  await Promise.all(
    TEMPLATE_IDS.map(async (id) => {
      const mod: unknown = await import(
        path.join(TEMPLATE_DIR, "templates", `${id}.tsx`)
      );
      return [id, toTemplateDefinition(mod, id)] as const;
    })
  )
);

interface JsonSchema {
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  "x-field"?: { translatable?: boolean };
}

/** Paths in a locale entry the schema can't translate: unknown keys or untranslatable fields. */
const untranslatable = (
  schema: JsonSchema,
  value: unknown,
  at: string
): string[] => {
  if (Array.isArray(value)) {
    return schema.items
      ? value.flatMap((item, index) =>
          untranslatable(schema.items as JsonSchema, item, `${at}[${index}]`)
        )
      : [at];
  }
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).flatMap(([key, child]) => {
      const childSchema = schema.properties?.[key];
      return childSchema
        ? untranslatable(childSchema, child, `${at}.${key}`)
        : [`${at}.${key}`];
    });
  }
  return schema["x-field"]?.translatable === true ? [] : [at];
};

describe("starter templates", () => {
  let cacheDir = "";
  let cache: InstanceType<typeof RenderCache>;

  beforeAll(async () => {
    cacheDir = mkdtempSync(path.join(tmpdir(), "starters-test-"));
    cache = new RenderCache({ cacheDir });
    await cache.init();
  });

  afterAll(() => {
    cache.close();
    rmSync(cacheDir, { force: true, recursive: true });
  });

  it("are all built with defineTemplate", () => {
    for (const [id, template] of starters) {
      expect({ id, legacy: template.legacy }).toEqual({ id, legacy: false });
    }
  });

  it.each(LOCALES)(
    "%s locale file only translates text the schemas declare",
    (locale) => {
      const translations = readLocale(locale);
      expect(Object.keys(translations).toSorted()).toEqual(
        [...starters.keys()].toSorted()
      );
      for (const [id, template] of starters) {
        const schema = zodToJsonSchemaShape(template.propsSchema) as JsonSchema;
        expect(untranslatable(schema, translations[id], id)).toEqual([]);
      }
    }
  );

  const cells = TEMPLATE_IDS.flatMap((id) =>
    LOCALES.flatMap((locale) =>
      PRESETS.map(([width, height]) => [id, locale, width, height] as const)
    )
  );

  it.each(cells)(
    "%s renders in %s at %ix%i",
    async (id, locale, width, height) => {
      const template = starters.get(id);
      if (!template) {
        throw new Error(`starter ${id} not loaded`);
      }
      const result = await orchestrateRender({
        cache,
        // No network in tests: an empty font set skips font loading, so text
        // uses the renderer's built-in face. Layout and validation still run.
        fonts: [],
        height,
        loadLocaleData: () => Promise.resolve(readLocale(locale)[id] ?? {}),
        locale,
        props: {},
        template,
        templateContentHash: id,
        templateId: id,
        width,
      });
      expect(result.bytes.length).toBeGreaterThan(0);
    }
  );
});
