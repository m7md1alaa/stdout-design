---
"@stdout-design/core": minor
"@stdout-design/cli": minor
"@stdout-design/web-ui": minor
---

Templates are written with `defineTemplate` (ADR-0019). A template declares its props with `field.*` builders, its fonts by role, and reads direction and type scale from the render context (`ctx.flip`, `ctx.type`, `ctx.fonts`). `@stdout-design/core/template` and `@stdout-design/cli/template` export the API and a small authoring kit (`keyed`, `words`, `Arrow`, `Sparkle`, `halftone`, `starburst`).

- Locale files replace only the props a template's schema marks as text; colors, numbers and list lengths stay as the template sets them. The studio edits props by the same field kinds.
- A template's declared fonts load on every locale. A `fonts` block in `studio.config.ts` is now optional and only overrides families, for example with a local file. `studio init` no longer writes one and `studio update` no longer merges fonts.
- `classifyLocale` is the one place a locale becomes a script (Latin, Arabic or Hebrew) and a direction. It replaces `scriptOf`, which is removed from `@stdout-design/core`. Hebrew locales fall back to Noto Sans Hebrew.
- The four starters are ported to `defineTemplate`.
