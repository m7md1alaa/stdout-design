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
| `templates/*.tsx` | One component per image. Its `propsSchema` is the form you see in the studio. |
| `locales/*.json` | Per-locale copy, keyed by template id. Strings here override the schema defaults. |
| `studio.config.ts` | Presets (canvas sizes), locales, registered templates, and fonts. |

## The starters

- **launch-hero**: a streetwear landing page with stickers, tilted cards, and a stats strip.
- **bento-feature**: a product bento grid with metric, chart, receipt, and gauge tiles.
- **retro-poster**: a print poster with a drawn cassette, tape stripes, and a rubber stamp.
- **trend-poster**: an editorial six-item grid with a drawn specimen in each cell.

Each one lays out at both 1080×1080 and 1200×675 and mirrors itself for Arabic. Rewrite them or delete them: `studio update` never overwrites a template you already have, and never brings back a starter you left out.

## Fonts

The `fonts` block in `studio.config.ts` pulls Google Fonts on the first render and caches them. It lists only the faces your starters use. `default` applies to every locale without its own entry, except Arabic: a Latin face has no Arabic glyphs, so Arabic gets its own entry with the Latin and Arabic faces together. Without one, Arabic falls back to Noto Sans Arabic. A template names its fonts in `fontFamily`, Latin face first: `"Archivo Black, Lalezar, sans-serif"`. Any glyph the first face lacks falls through to the next.

## Writing RTL templates

`dir="rtl"` mirrors flex rows and text alignment for you. It does not mirror absolute `left`/`right` offsets or physical margins, so the starters pick a side with `const start = isRtl ? "right" : "left"`. Wrap brand names and numbers like `+18%` in `<span dir="ltr">` to keep bidi from reordering them.
