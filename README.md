# stdout-design

> Storybook for images — in your repo and speaking to your agents.

An open-source, local-first studio that renders your own TSX components into finished social/marketing images and GIFs — with a CLI for scripting, a live prop-editing UI for iteration, and an MCP server so any AI agent can generate assets on command.

## Quick start

```bash
bun add -d @stdout-design/cli
npx studio render bento-feature --title "10k users" --stat "launched" --out post.png
```

## Why

Founders and indie hackers build entire products through AI coding agents. When they need marketing assets App Store screenshots, Instagram cards, launch banners, Product Hunt graphics the existing workflow is: leave the codebase, redo UI by hand in Figma or canva, or buy a SaaS dashboard. stdout-design keeps everything in your repo, in TSX.

## Features

- **Render from TSX** — Write plain React components with typed props. No custom DSL. Takumi under the hood.
- **Batch & data-driven** — `studio render template --data posts.csv --out-dir ./out/` renders one asset per row.
- **Live studio** — `studio dev` with hot-reload, auto-generated prop panel from TypeScript types, side-by-side preset preview.
- **Agent-ready** — MCP server exposes `list_templates`, `render`, `render_batch`. Agents write template TSX and CSV data; you ship.
- **Platform presets** — Instagram square/story, X card, App Store/Play Store screenshot, each with correct aspect ratio and safe-zone overlays.
- **i18n first-class** — Locale-aware batch rendering (`--locales en,ar,es`), RTL support, tofu detection for missing font glyphs.

## CLI

```bash
studio render <template> [--prop value] [--data file] [--preset name] [--locale lang]
studio dev
```

## Templates

A template is a plain TSX component. Drop one in `templates/` and it's immediately renderable.

```tsx
type Props = { title: string; stat: string; image?: string };

export default function MilestoneCard({ title, stat }: Props) {
  return <div className="...">{/* your design */}</div>;
}
```

## Project structure

```
studio.config.ts      # template registry, output presets, locales
templates/            # your TSX components
data/                 # CSV/JSON for batch renders
locales/              # translation files
out/                  # rendered assets (gitignored)
```

## License

ISC
