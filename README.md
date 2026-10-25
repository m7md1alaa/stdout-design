# stdout-design

<p align="center">
  <a href="https://www.npmjs.com/package/@stdout-design/cli">
    <img src="https://img.shields.io/npm/v/@stdout-design/cli" alt="npm version">
  </a>
  <img src="https://img.shields.io/npm/l/@stdout-design/cli" alt="MIT license">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Bun-000?logo=bun&logoColor=white" alt="Bun">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs welcome">
</p>

> Storybook for images — in your repo and speaking to your agents.

An open-source, local-first studio that renders your own TSX components into pixel-perfect social and marketing images. CLI for scripting, live UI for iteration, and an agent skill for AI coding agents.

## Quick start

```bash
# Scaffold a project (installs dependencies with the package manager you ran it with)
bunx @stdout-design/cli init my-studio
cd my-studio

# Render an image → out/bento-feature.default.instagram-square.0.png
bun run render bento-feature --headline "Hello"

# Or open the live studio on http://localhost:3030
bun run dev
```

## Installation

```bash
bun add -d @stdout-design/cli
```

**Prerequisites:** Node.js 22.22+, Bun 1.2+.

## Features

- **Render from TSX** — plain React components. No custom DSL.
- **Batch & data-driven** — `--data posts.csv` renders one asset per row.
- **Live studio** — hot-reload, auto-generated prop panel, side-by-side preset preview.
- **Agent-ready** — installable agent skill, deterministic output paths, and `--json` output.
- **Any size** — define presets for Instagram, X, LinkedIn, OG, store screenshots, or anything else.
- **i18n** — `--locales en,ar,es`, RTL support, tofu detection for missing glyphs.
- **Built-in cache** — fast re-renders without regenerating unchanged assets.

## CLI

| Command                    | Description                        |
| -------------------------- | ---------------------------------- |
| `studio init`              | Scaffold a new studio project      |
| `studio dev`               | Start the live preview studio      |
| `studio render <template>` | Render a single template or batch  |
| `studio cache stats`       | Show cache statistics              |
| `studio cache clean`       | Clear the render cache             |
| `studio update`            | Update a project to the latest CLI |
| `studio skill install`     | Install the agent skill            |

Inside a scaffolded project, run them through your package manager (`bun run render …`, `bunx studio …`). Commands work from any subdirectory of the project. Set `STUDIO_DEBUG=1` for verbose logs.

### studio render

```bash
studio render <template> [props...] [options]
```

| Option | Description |
| --- | --- |
| `key=value` / `--key value` | Template props, validated against the template's `propsSchema` |
| `--data file.csv` | Batch render: one image per CSV/JSON row |
| `--preset ids` | Comma-separated preset IDs, or `all` (default: `defaultPreset`) |
| `--locale en,ar` | Render once per locale, using `locales/<code>.json` |
| `--out-dir path` | Output directory (default: config `outDir`, else `./out`) |
| `--json` | Print the render manifest as JSON on stdout |

### studio dev

Starts a dev server on `localhost:3030` (`--port` to change, `--open` to open a browser) with:

- Hot-reload when templates change
- Auto-generated prop panel
- Side-by-side preview across presets
- Export templates to PNG

## Writing templates

A template is a TSX component plus a Zod `propsSchema`, styled with Tailwind classes on the `tw` prop:

```tsx
// templates/milestone-card.tsx
import { defineSchema } from "@stdout-design/cli/schema";
import { z } from "zod";

export const propsSchema = defineSchema(
  z.object({
    title: z.string().default("Milestone"),
    stat: z.string().default("10k users"),
  })
);

export default function MilestoneCard({
  title,
  stat,
}: z.infer<typeof propsSchema>) {
  return (
    <div tw="flex flex-col w-full h-full justify-center bg-black p-16 text-white">
      <h1 tw="text-6xl font-bold">{title}</h1>
      <p tw="mt-4 text-3xl">{stat}</p>
    </div>
  );
}
```

Register it in `studio.config.ts` under `templates` (`"milestone-card": { componentPath: "./templates/milestone-card" }`), then `studio render milestone-card stat="50k users"`.

## AI agent integration

Install the agent skill so coding agents (Claude Code, Cursor, …) know how to work with a studio project:

```bash
studio skill install        # or: init --install-skill
```

Output paths are deterministic (`<template>.<locale>.<preset>.<row>.png`), and `render --json` prints a machine-readable manifest.

## Project structure

```
my-project/
├── studio.config.ts      template registry, presets, locales
├── templates/            your TSX components
├── data/                 CSV/JSON for batch renders
├── locales/              per-locale prop overrides, keyed by template id
└── out/                  rendered assets (gitignored)
```

## Configuration

```ts
import type { StudioConfig } from "@stdout-design/cli";

const config: StudioConfig = {
  defaultPreset: "og",
  outDir: "./out",
  presets: [
    { id: "og", platform: "web", width: 1200, height: 630 },
    { id: "instagram", platform: "instagram", width: 1080, height: 1080 },
  ],
  templates: {
    "bento-feature": { componentPath: "./templates/bento-feature" },
  },
};

export default config;
```

Locale files map template ids to prop overrides, e.g. `locales/ar.json`:

```json
{ "bento-feature": { "headline": "التطبيق المميز" } }
```

## Common preset sizes

Presets are whatever you define in `studio.config.ts`; these are handy sizes to copy:

| Preset          | Size      | Use                       |
| --------------- | --------- | ------------------------- |
| og              | 1200×630  | Open Graph / social cards |
| x-card          | 1200×675  | X (Twitter) cards         |
| linkedin        | 1200×627  | LinkedIn link previews    |
| instagram       | 1080×1080 | Instagram feed posts      |
| instagram-story | 1080×1920 | Instagram stories         |
| appstore        | 1290×2796 | App Store screenshots     |
| playstore       | 1080×1920 | Play Store screenshots    |

## License

MIT
