# @stdout-design/dev-server

## 0.9.0

### Minor Changes

- 51f287e: Locale layers (ADR-0021): with a locale picked, the studio shows each field with that locale's text and edits to translatable text apply to that locale only.

  - core: `resolveLocaleLayers` resolves a locale's props from the base values, the locale file, and per-locale overrides; `flattenTranslations` and `translationsFromPaths` convert a locale file to and from text by prop path (`TranslationPaths`). `orchestrateRender` and `orchestrateMeasure` take `localeOverrides`.
  - dev-server: `/render` and `/measure` accept `localeOverrides`; `GET /translations/:templateId/:locale` returns a locale file's strings for a template by path. Locale ids that aren't plain ids no longer read files.
  - web-ui: translatable fields show the picked locale's text and carry a locale tag; the reset dot brings back the locale file's string; list reorders keep per-locale text with its item. Validation errors now land on the field they name.

- 51f287e: The studio is redesigned (ADR-0020): a toolbar on top, a canvas that fits the window and zooms, and an inspector on the right.

  - The preview keeps the last frame while the next one renders. Fields get plain labels, sliders and typed values, editable and reorderable lists, collapsed object-list rows, a reset dot on changed values, and errors on the field they belong to.
  - `defineTemplate` takes an optional `inspector` list that names the groups and the order of fields in each; `field.*` takes an optional `label`. dev-server sends both to the studio. The four starters declare their layout.
  - The studio colors and chrome are neutral, with Geist and Geist Mono. The 2,789-line color picker is replaced by a hex field with a small picker, and `framer-motion` is gone from `@stdout-design/web-ui`.

### Patch Changes

- Updated dependencies [51f287e]
- Updated dependencies [51f287e]
  - @stdout-design/core@0.9.0

## 0.8.0

### Patch Changes

- Updated dependencies
  - @stdout-design/core@0.8.0

## 0.7.1

### Patch Changes

- 41481e3: The dev server runs on Node, not only Bun. It listens through `@hono/node-server` and serves the web UI with `node:fs`, so `studio dev` works under both runtimes. A port that is already in use still reports a clear error.
- @stdout-design/core@0.7.1

## 0.7.0

### Patch Changes

- Updated dependencies [06756b2]
  - @stdout-design/core@0.7.0

## 0.6.0

### Minor Changes

- 5803592: CLI usability fixes:

  - `render` now renders only `defaultPreset` by default; pass `--preset all` for every preset.
  - Unknown props are an error with a "did you mean" suggestion; props accept `--key value` as well as `key=value`.
  - Debug logs are off unless `STUDIO_DEBUG=1`, and all logs go to stderr, so `render --json` output is clean.
  - Shorter render summary with relative paths; preset-not-found errors list the available presets.
  - Commands find `studio.config.ts` from any subdirectory; `dev` and `render` print an actionable error outside a project.
  - `init` writes locale files keyed by template id (so `--locale` actually translates), installs with the package manager that launched it, and reports install failures. Fixed the starter template's missing-glyph icon.
  - Missing or invalid `locales/<code>.json` now warns or errors instead of being silently ignored.
  - `dev --open` opens the browser; a taken port gives a clear error.
  - Stop the takumi `stylesheets` deprecation warning on every render.

### Patch Changes

- Updated dependencies [5803592]
  - @stdout-design/core@0.6.0

## 0.5.0

### Minor Changes

- 49901fa: Update all dependencies to their latest versions, including chokidar 6, framer-motion 14, TanStack Hotkeys 0.18 and Vite 8.3.

  Takumi 2.17: `registerFont` now forwards its abort signal correctly (Takumi inserted a `key` parameter) and resolves to family-name strings as typed, and stylesheets are sent to Takumi as `css` instead of the deprecated `stylesheets` field.

  **Breaking:** `@stdout-design/cli`, `@stdout-design/core` and `@stdout-design/dev-server` now require Node.js 22.22 or later (declared in `engines`), because chokidar 6 and better-sqlite3 13 dropped older Node versions.

### Patch Changes

- Updated dependencies [49901fa]
  - @stdout-design/core@0.5.0

## 0.4.0

### Minor Changes

- Wire font and image resolution from studio config into render/measure requests, and clear font/render caches on full config reload. Fix `/cache/stats` to await the async cache stats call, and change the default dev server port to 3030.

### Patch Changes

- Updated dependencies
  - @stdout-design/core@0.4.0
