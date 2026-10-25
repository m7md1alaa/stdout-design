---
"@stdout-design/cli": minor
"@stdout-design/core": minor
---

Poster starters, with Arabic RTL versions:

- `init` offers four poster-style starters: Launch Hero, Bento Feature, Retro Poster and Trend Poster, each with English and Arabic copy. The config loads only the Google Fonts the chosen starters use, for the chosen locales.
- `init` records the project's `locales` in `studio.config.ts`; `render <id>` renders every recorded locale and the dev server lists them.
- `update` follows what `init` chose: it adds only starters shipped since the project's `scaffoldVersion`, with their template files, locale strings and fonts, and never re-adds a starter you left out, overwrites your files, or adds fonts for locales you don't use.
- Config fonts load for every locale, not just Arabic; a Latin locale uses the `default` entry.
- An Arabic locale whose fonts fail to load falls back to Noto Sans Arabic instead of rendering with no fonts.
- Locales that share fonts download them once.
