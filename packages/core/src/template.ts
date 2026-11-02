/**
 * The template authoring surface (ADR-0019): everything a template file
 * imports. Re-exported by `@stdout-design/cli/template`.
 */
export { defineTemplate } from "./template/define-template.js";
export type {
  InspectorGroup,
  InspectorLayout,
  TemplateDefinition,
  TemplateSpec,
} from "./template/define-template.js";
export { field } from "./template/field.js";
export {
  Arrow,
  halftone,
  keyed,
  Sparkle,
  starburst,
  words,
} from "./template/kit.js";
export type { Keyed } from "./template/kit.js";
export type { FontFace, FontRole, FontRoles } from "./template/fonts.js";
export type {
  Canvas,
  RenderContext,
  TypeSpec,
} from "./template/render-context.js";
export type { Direction, LocaleInfo, Script } from "./shared/locale.js";
