---
"@stdout-design/cli": minor
"@stdout-design/core": minor
"@stdout-design/dev-server": minor
---

CLI usability fixes:

- `render` now renders only `defaultPreset` by default; pass `--preset all` for every preset.
- Unknown props are an error with a "did you mean" suggestion; props accept `--key value` as well as `key=value`.
- Debug logs are off unless `STUDIO_DEBUG=1`, and all logs go to stderr, so `render --json` output is clean.
- Shorter render summary with relative paths; preset-not-found errors list the available presets.
- Commands find `studio.config.ts` from any subdirectory; `dev` and `render` print an actionable error outside a project.
- `init` writes locale files keyed by template id (so `--locale` actually translates), installs with the package manager that launched it, and reports install failures. Fixed the starter template's missing-glyph icon.
- Missing or invalid `locales/<code>.json` now warns or errors instead of being silently ignored.
- `dev --open` opens the browser; a taken port gives a clear error.
- Stop the takumi `stylesheets` deprecation warning on every render.
