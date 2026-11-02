---
"@stdout-design/core": minor
"@stdout-design/cli": minor
"@stdout-design/dev-server": minor
"@stdout-design/web-ui": minor
---

The studio is redesigned (ADR-0020): a toolbar on top, a canvas that fits the window and zooms, and an inspector on the right.

- The preview keeps the last frame while the next one renders. Fields get plain labels, sliders and typed values, editable and reorderable lists, collapsed object-list rows, a reset dot on changed values, and errors on the field they belong to.
- `defineTemplate` takes an optional `inspector` list that names the groups and the order of fields in each; `field.*` takes an optional `label`. dev-server sends both to the studio. The four starters declare their layout.
- The studio colors and chrome are neutral, with Geist and Geist Mono. The 2,789-line color picker is replaced by a hex field with a small picker, and `framer-motion` is gone from `@stdout-design/web-ui`.
