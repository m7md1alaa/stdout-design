---
"@stdout-design/core": minor
"@stdout-design/dev-server": minor
"@stdout-design/web-ui": minor
---

Locale layers (ADR-0021): with a locale picked, the studio shows each field with that locale's text and edits to translatable text apply to that locale only.

- core: `resolveLocaleLayers` resolves a locale's props from the base values, the locale file, and per-locale overrides; `flattenTranslations` and `translationsFromPaths` convert a locale file to and from text by prop path (`TranslationPaths`). `orchestrateRender` and `orchestrateMeasure` take `localeOverrides`.
- dev-server: `/render` and `/measure` accept `localeOverrides`; `GET /translations/:templateId/:locale` returns a locale file's strings for a template by path. Locale ids that aren't plain ids no longer read files.
- web-ui: translatable fields show the picked locale's text and carry a locale tag; the reset dot brings back the locale file's string; list reorders keep per-locale text with its item. Validation errors now land on the field they name.
