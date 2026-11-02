# {{projectName}}

Social images as React components, rendered to PNG by [stdout design](https://github.com/m7md1alaa/stdout-design).

## Run it

```bash
npm run dev                                  # live studio with every template and preset
npm run render launch-hero                   # one template, every locale, to ./out
npm run render launch-hero --preset all      # every preset in studio.config.ts
npm run render launch-hero --locale ar       # just the Arabic (RTL) version
```

## What's here

| Path | What it is |
| --- | --- |
| `templates/*.tsx` | One `defineTemplate` per image. Its `schema` is the form you see in the studio. |
| `locales/*.json` | Per-locale copy, keyed by template id. Text fields here replace the schema defaults; colors, numbers, and list lengths never change. |
| `studio.config.ts` | Presets (canvas sizes), locales, registered templates, and optional font overrides. |

## The starters

- **launch-hero**: a streetwear landing page with stickers, tilted cards, and a stats strip.
- **bento-feature**: a product bento grid with metric, chart, receipt, and gauge tiles.
- **retro-poster**: a print poster with a drawn cassette, tape stripes, and a rubber stamp.
- **trend-poster**: an editorial six-item grid with a drawn specimen in each cell.

Each one lays out at both 1080×1080 and 1200×675 and mirrors itself for Arabic. Rewrite them or delete them: `studio update` never overwrites a template you already have, and never brings back a starter you left out.

## Fonts

Each template declares its fonts, and the studio loads them from Google Fonts on the first render and caches them:

```tsx
fonts: {
  display: { faces: ["Archivo Black", "Lalezar"] },
  mono: { faces: [{ family: "Space Mono", weights: [400, 700] }], generic: "monospace" },
},
```

Put the Latin face first and the Arabic one after it: a glyph the first face lacks falls through to the next. Use a role as `ctx.fonts.display`, or as `font: "display"` in `ctx.type()`. To swap a family for a local file, add a `fonts` block to `studio.config.ts`; a family the config loads replaces the template's.

## Writing RTL templates

`render` receives `ctx`, and the root element gets `dir` and `lang` for the locale, so:

- Flex rows, text alignment, and logical CSS properties (`insetInlineStart`, `marginInlineEnd`, `borderInlineStart`, `paddingInlineStart`) mirror on their own. Use them instead of `left`/`right`.
- `ctx.flip(-6)` mirrors what CSS can't: rotation angles and SVG offsets. `<Arrow ctx={ctx} />` points the right way.
- `ctx.type({ size, leading, tracking, italic, uppercase })` adapts a Latin text style to the script: Arabic drops letter spacing and italics and gets taller lines.
- Wrap brand names and numbers like `+18%` in `<span dir="ltr">` to keep bidi from reordering them.
