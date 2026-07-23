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

An open-source, local-first studio that renders your own TSX components into pixel-perfect social and marketing images. CLI for scripting, live UI for iteration, MCP server for AI agents.

## Quick start

```bash
# Install
bun add -d @stdout-design/cli

# Scaffold a project
npx @stdout-design/cli init

# Render an image
npx @stdout-design/cli render bento-feature --title "Hello" --out hello.png

# Or open the live studio
npx @stdout-design/cli dev
```

## Installation

```bash
bun add -d @stdout-design/cli
```

**Prerequisites:** Node.js 18+, Bun 1.2+.

## Features

- **Render from TSX** — plain React components. No custom DSL.
- **Batch & data-driven** — `--data posts.csv` renders one asset per row.
- **Live studio** — hot-reload, auto-generated prop panel, side-by-side preset preview.
- **Agent-ready** — MCP server so agents can discover templates and render assets.
- **Platform presets** — Instagram, X, LinkedIn, OG, App Store, Play Store.
- **i18n** — `--locales en,ar,es`, RTL support, tofu detection for missing glyphs.
- **Built-in cache** — fast re-renders without regenerating unchanged assets.

## CLI

| Command                    | Description                       |
| -------------------------- | --------------------------------- |
| `studio init`              | Scaffold a new studio project     |
| `studio dev`               | Start the live preview studio     |
| `studio render <template>` | Render a single template or batch |
| `studio cache stats`       | Show cache statistics             |
| `studio cache clean`       | Clear the render cache            |
| `studio lint`              | Check templates for compatibility |

Run commands with `npx @stdout-design/cli <command>`, or install globally with `bun add -g @stdout-design/cli` to use `studio <command>` directly.

### studio render

```bash
studio render <template> [options]
```

| Option            | Description                        |
| ----------------- | ---------------------------------- |
| `--key value`     | Pass props to the template         |
| `--data file.csv` | Batch render from CSV or JSON      |
| `--preset name`   | Output preset (default: og)        |
| `--locale lang`   | Locale for i18n                    |
| `--out-dir path`  | Output directory (default: ./out/) |
| `--out file.png`  | Single output file                 |

### studio dev

Starts a dev server on `localhost:3000` with:

- Hot-reload when templates change
- Auto-generated prop panel
- Side-by-side preview across presets
- Export templates to PNG

## Writing templates

A template is a TSX component with typed props:

```tsx
type Props = {
  title: string;
  stat: string;
};

export default function MilestoneCard({ title, stat }: Props) {
  return (
    <div className="bg-black text-white p-8 rounded-2xl">
      <h1 className="text-4xl font-bold">{title}</h1>
      <p className="text-lg mt-2">{stat}</p>
    </div>
  );
}
```

Drop it in `templates/` and it's immediately renderable.

## AI agent integration

Add to your agent's MCP config:

```json
{
  "mcpServers": {
    "stdout-design": {
      "command": "npx",
      "args": ["-y", "@stdout-design/cli", "mcp"]
    }
  }
}
```

**Available tools:** `list_templates`, `render`, `render_batch`, `list_presets`

## Project structure

```
my-project/
├── studio.config.ts      template registry, presets, locales
├── templates/            your TSX components
├── data/                 CSV/JSON for batch renders
├── locales/              translation files
└── out/                  rendered assets (gitignored)
```

## Configuration

```ts
export default {
  templates: "./templates",
  presets: [
    { name: "og", width: 1200, height: 630 },
    { name: "instagram", width: 1080, height: 1080 },
  ],
  locales: ["en", "ar"],
  outDir: "./out",
};
```

## Platform presets

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
