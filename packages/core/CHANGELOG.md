# @stdout-design/core

## 0.7.1

No changes in this release.

## 0.7.0

### Minor Changes

- 06756b2: Poster starters, with Arabic RTL versions:

  - `init` offers four poster-style starters: Launch Hero, Bento Feature, Retro Poster and Trend Poster, each with English and Arabic copy. The config loads only the Google Fonts the chosen starters use, for the chosen locales.
  - `init` records the project's `locales` in `studio.config.ts`; `render <id>` renders every recorded locale and the dev server lists them.
  - `update` follows what `init` chose: it adds only starters shipped since the project's `scaffoldVersion`, with their template files, locale strings and fonts, and never re-adds a starter you left out, overwrites your files, or adds fonts for locales you don't use.
  - Config fonts load for every locale, not just Arabic; a Latin locale uses the `default` entry.
  - An Arabic locale whose fonts fail to load falls back to Noto Sans Arabic instead of rendering with no fonts.
  - Locales that share fonts download them once.

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

## 0.5.0

### Minor Changes

- 49901fa: Update all dependencies to their latest versions, including chokidar 6, framer-motion 14, TanStack Hotkeys 0.18 and Vite 8.3.

  Takumi 2.17: `registerFont` now forwards its abort signal correctly (Takumi inserted a `key` parameter) and resolves to family-name strings as typed, and stylesheets are sent to Takumi as `css` instead of the deprecated `stylesheets` field.

  **Breaking:** `@stdout-design/cli`, `@stdout-design/core` and `@stdout-design/dev-server` now require Node.js 22.22 or later (declared in `engines`), because chokidar 6 and better-sqlite3 13 dropped older Node versions.

## 0.4.0

### Minor Changes

- Add configurable local/remote font resolution per locale, an image resolver and bounded image fetch cache, and an OG image response pipeline (`core/og`). Improve cache robustness and performance (compile cache, render cache, fs store), and export the new APIs from the package root.
