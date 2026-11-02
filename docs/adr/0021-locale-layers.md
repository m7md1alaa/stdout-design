# 0021. Locale layers: base values, locale file, per-locale overrides

## Status

Accepted. Builds on ADR-0019 (translatable field meta) and ADR-0014 (an auto-detected locale loads no translations).

## Context

Picking a locale in the studio sent the inspector's values plus `locale` to `/render`, and core replaced every translatable field with the string from `locales/<locale>.json`. The studio never saw that file, so:

- With `ar` picked, the inspector showed the English values while the canvas showed Arabic.
- Typing into a translatable field did nothing visible: the locale file replaced it on every render. Non-translatable fields (colors, numbers) did change, so it looked random.
- Nothing had a place to keep "this headline, in Arabic only", which per-locale editing, saving to a locale file, and translation status all need.

## Decision

1. **A locale's props resolve from three layers, later ones winning:** the base values, the locale file's entry for the template, and that locale's overrides. `resolveLocaleLayers(schema, base, { translations, overrides })` in core's `shared/locale-layers.ts` is the one place that does it. Both upper layers go through `applyTranslations`, so they only replace text the schema marks translatable, at any depth, and never change a list's length. Colors, numbers, URLs and list structure always come from the base values. The result is validated again, as before.
2. **Overrides use the same shape as a locale file, flattened by path** (`TranslationPaths`: `{ "headline": "…", "stats.1.label": "…" }`). `flattenTranslations` turns a locale file into that form and `translationsFromPaths` turns it back; a list item a path doesn't name becomes `null`, which the merge reads as "keep the base value". One format means the layers can be listed, diffed, reset one field at a time, and later written into a locale file.
3. **Layers apply only to a locale the user picked.** An auto-detected locale (ADR-0014) gets fonts and direction, not the locale file or overrides. dev-server and the studio make the same call.
4. **dev-server** accepts `localeOverrides` on `/render` and `/measure`, and serves `GET /translations/:templateId/:locale`, the locale file's strings for one template, flattened by core. A locale id must be configured, and a locale file name must be a plain id.
5. **The studio** keeps overrides per template and per locale (saved with the rest of its state and in share links), shows each field's value with the layers applied, and tags fields edited for the current locale. An edit to translatable text becomes an override; any other edit goes to the base values. The reset dot on a tagged field removes the override, bringing back the file's string. Lists report structural changes as operations (`insert`, `remove`, `move`, `duplicate`) that apply to the base list and re-key every locale's overrides, so an override stays with its item. The studio reads which fields are translatable from `x-field.translatable` in the JSON schema, the same flag core uses.

## Consequences

**Positive**

- What the inspector shows is what renders, in every locale.
- One primitive serves the studio, dev-server, and later batch rendering (per-locale data rows) and tooling: write overrides into `locales/*.json`, list strings a locale file is missing, machine-translate the gaps.
- The merge rule stays in core; the studio only looks values up by path and reads the published translatable flag.

**Negative**

- Locale files address list items by position. Reordering a list moves the studio's overrides with their items, but a locale file's strings stay at their positions. Keyed list items would fix this for both.
- Overrides live in the studio's browser storage until a "save to locale file" step exists.
