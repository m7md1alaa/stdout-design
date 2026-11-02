import { createElement } from "react";
import type { ComponentType, ReactElement } from "react";
import { z } from "zod";

import { AppError, ErrorCode } from "../shared/error-codes.js";
import { logWarn } from "../shared/logger.js";
import { isZodObject } from "../shared/validation.js";
import type { PropSchema } from "../shared/validation.js";
import type { FontRoles } from "./fonts.js";
import type { RenderContext } from "./render-context.js";

// Global symbol, so a template bundled against another copy of core still
// reads as a template.
const TEMPLATE_BRAND = Symbol.for("stdout-design.template");

/** Prop names the pipeline owns. A schema that declares one fails to type-check. */
const RESERVED_KEYS = ["locale", "ctx"] as const;

type ReservedKey = (typeof RESERVED_KEYS)[number];

/** One named group of the studio's inspector and the schema keys in it, in order. */
export type InspectorGroup<K extends string = string> = readonly [
  title: string,
  keys: readonly K[],
];

/** How the studio lays out a template's fields: groups, then keys inside each. */
export type InspectorLayout<K extends string = string> =
  readonly InspectorGroup<K>[];

type FlatKeys<G> = G extends readonly [
  readonly [string, infer Ks extends readonly string[]],
  ...infer Rest,
]
  ? [...Ks, ...FlatKeys<Rest>]
  : [];

type HasDuplicate<T extends readonly string[]> = T extends readonly [
  infer Head extends string,
  ...infer Tail extends readonly string[],
]
  ? Head extends Tail[number]
    ? true
    : HasDuplicate<Tail>
  : false;

/** Resolves to `never` for the `inspector` property when a key appears twice, so the call fails to type-check. */
type UniqueKeys<G> =
  HasDuplicate<FlatKeys<G>> extends true ? { inspector: never } : unknown;

export interface TemplateSpec<
  S extends z.ZodRawShape,
  R extends string,
  G extends InspectorLayout<keyof S & string> = [],
> {
  /** User content only, built from `field.*`. Render facts arrive as `ctx`. */
  schema: S & Readonly<Partial<Record<ReservedKey, never>>>;
  /**
   * The studio's field layout: named groups of schema keys, in order. A key
   * the list omits goes to a trailing "Other" group; naming an unknown key,
   * or a key twice, is a type error. Without it the studio groups by kind.
   */
  inspector?: G;
  /** Font roles; `ctx.fonts[role]` is the CSS stack and the pipeline loads every face. */
  fonts?: FontRoles<R>;
  render: (
    props: z.output<z.ZodObject<S>>,
    ctx: RenderContext<R>
  ) => ReactElement;
}

/**
 * The one shape the pipeline renders. `defineTemplate` builds it;
 * `toTemplateDefinition` builds the same shape from a legacy module.
 */
export interface TemplateDefinition {
  readonly [TEMPLATE_BRAND]: true;
  readonly propsSchema: PropSchema;
  readonly fonts: FontRoles;
  /** Field layout for the studio's inspector; absent means group by kind. */
  readonly inspector?: InspectorLayout;
  /**
   * Built from a component plus `propsSchema` export. Legacy templates
   * mirror themselves from the `locale` prop, so the pipeline sets no `dir`
   * on their root (it would mirror them twice) and does not re-check props
   * after translation.
   */
  readonly legacy: boolean;
  readonly render: (
    props: Record<string, unknown>,
    ctx: RenderContext
  ) => ReactElement;
}

const assertInspector = (
  inspector: InspectorLayout,
  schemaKeys: readonly string[]
): void => {
  const seen = new Set<string>();
  for (const [title, keys] of inspector) {
    for (const key of keys) {
      if (!schemaKeys.includes(key)) {
        throw new AppError(
          ErrorCode.TEMPLATE_INVALID_EXPORT,
          `Template inspector group "${title}" names "${key}", which is not in the schema.`
        );
      }
      if (seen.has(key)) {
        throw new AppError(
          ErrorCode.TEMPLATE_INVALID_EXPORT,
          `Template inspector names "${key}" more than once.`
        );
      }
      seen.add(key);
    }
  }
};

export const defineTemplate = <
  S extends z.ZodRawShape,
  R extends string = never,
  const G extends InspectorLayout<keyof S & string> = [],
>(
  spec: TemplateSpec<S, R, G> & UniqueKeys<G>
): TemplateDefinition => {
  const reserved = RESERVED_KEYS.filter((key) => key in spec.schema);
  if (reserved.length > 0) {
    throw new AppError(
      ErrorCode.TEMPLATE_INVALID_EXPORT,
      `Template schema declares ${reserved.join(", ")}, which the pipeline provides as ctx. Remove ${reserved.length > 1 ? "them" : "it"} and read ctx instead.`
    );
  }
  if (spec.inspector) {
    assertInspector(spec.inspector, Object.keys(spec.schema));
  }
  return {
    [TEMPLATE_BRAND]: true,
    fonts: spec.fonts ?? {},
    inspector: spec.inspector,
    legacy: false,
    // The schema validates props before `render` runs, so the widened
    // signatures below hold at runtime.
    propsSchema: z.object(spec.schema) as unknown as PropSchema,
    render: spec.render as unknown as TemplateDefinition["render"],
  };
};

export const isTemplateDefinition = (
  value: unknown
): value is TemplateDefinition =>
  typeof value === "object" &&
  value !== null &&
  (value as Record<symbol, unknown>)[TEMPLATE_BRAND] === true;

const warnedLegacyLocale = new Set<string>();

/**
 * Wraps a legacy template (a component default export plus a `propsSchema`
 * export) in the definition shape. Until 1.0 it still receives `locale` as
 * a prop, on every render path (ADR-0019).
 */
export const legacyTemplateDefinition = (
  component: ComponentType<Record<string, unknown>>,
  propsSchema: PropSchema,
  templateId = "template"
): TemplateDefinition => {
  if ("locale" in propsSchema.shape && !warnedLegacyLocale.has(templateId)) {
    warnedLegacyLocale.add(templateId);
    logWarn(
      `Template "${templateId}" declares a "locale" prop. It still works until 1.0, but switch to defineTemplate and read ctx.dir / ctx.locale instead.`
    );
  }
  return {
    [TEMPLATE_BRAND]: true,
    fonts: {},
    legacy: true,
    propsSchema,
    render: (props, ctx) =>
      createElement(
        component,
        ctx.locale.id === "default"
          ? props
          : { ...props, locale: ctx.locale.id }
      ),
  };
};

/** Reads a loaded template module, in either shape. Throws `TEMPLATE_INVALID_EXPORT` otherwise. */
export const toTemplateDefinition = (
  mod: unknown,
  templateId: string
): TemplateDefinition => {
  const { default: defaultExport, propsSchema } = (mod ?? {}) as Record<
    string,
    unknown
  >;
  if (isTemplateDefinition(defaultExport)) {
    return defaultExport;
  }
  if (typeof defaultExport !== "function") {
    throw new AppError(
      ErrorCode.TEMPLATE_INVALID_EXPORT,
      `Template "${templateId}" must have a default export: defineTemplate({ schema, render }), or a component function alongside a "propsSchema" export.`,
      { templateId }
    );
  }
  if (!isZodObject(propsSchema)) {
    throw new AppError(
      ErrorCode.TEMPLATE_INVALID_EXPORT,
      `Template "${templateId}" must export a "propsSchema" that is a z.object({...}), or default-export defineTemplate({ schema, render }).`,
      { templateId }
    );
  }
  return legacyTemplateDefinition(
    defaultExport as ComponentType<Record<string, unknown>>,
    propsSchema,
    templateId
  );
};
