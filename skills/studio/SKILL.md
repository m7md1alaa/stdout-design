---
name: studio
description: "Social media design toolkit — render TSX templates into images, preview in a dev server, and scaffold projects. Use when the user asks to create social/marketing images, render design templates, set up a studio project, or generate Open Graph images."
---

# studio

CLI toolkit for rendering TSX components into social/marketing images.

## CLI Commands

```bash
studio render <template> [props...]       # Render a template
studio dev                                 # Start dev server with live preview
studio init [projectDir]                   # Scaffold a new studio project
studio update [projectDir]                 # Update an existing project
studio cache stats                         # Show cache statistics
studio cache clean                         # Clear the render cache
studio lint                                # Check template compatibility
studio skill install                       # Install/uninstall the agent skill
```

## Key Options

### `studio render`

- `--data <path>` — CSV or JSON data file for batch rendering
- `--preset <ids>` — Comma-separated preset IDs (e.g. `og,instagram`)
- `--locale <locales>` — Comma-separated locale codes (e.g. `en,ar`)
- `--out-dir <path>` — Output directory (default: `./out`)
- `--concurrency <n>` — Max concurrent renders in batch mode (default: 4)
- `--fail-fast` — Stop batch on first error
- `--json` — Output results as JSON

### `studio dev`

- `-p, --port <number>` — Port to run on (default: 3000)
- `--open` — Open browser on start

### `studio init`

- `-y, --yes` — Skip prompts, use defaults
- `--install-skill` — Install the studio agent skill

## Config File

A `studio.config.ts` file defines presets and templates:

```ts
import type { StudioConfig } from "@stdout-design/cli";

const config: StudioConfig = {
  defaultPreset: "og",
  outDir: "./out",
  presets: [
    { id: "og", width: 1200, height: 630, platform: "og-image" },
    { id: "instagram", width: 1080, height: 1080, platform: "instagram" },
  ],
  templates: {
    "bento-feature": {
      componentPath: "templates/bento-feature.tsx",
      description: "Apple-style feature card",
    },
  },
};

export default config;
```

## Common Tasks

### Initializing a project

```bash
studio init my-project
cd my-project
```

### Rendering a template

```bash
studio render bento-feature
studio render bento-feature title="Hello World" --preset og
studio render bento-feature --data batch.csv --concurrency 8
```

### Starting the dev server

```bash
studio dev --port 4000 --open
```

## Batch Rendering

When `--data` is provided, the render command processes every row in the file:

```csv
title,locale
"Hello World",en
"مرحبا بالعالم",ar
```

```bash
studio render bento-feature --data batch.csv --locale en --out-dir ./output --concurrency 8
```

Columns in the data file override props; `--locale` and `--preset` apply globally.

## Project Structure

A scaffolded studio project:

```
my-project/
├── studio.config.ts
├── templates/
│   └── bento-feature.tsx
├── package.json
├── tsconfig.json
└── .gitignore
```

## Bilingual / RTL

- `studio init` asks which locales to include (e.g. English, Arabic)
- Locale-aware rendering via `--locale` flag
- Arabic locale auto-enables RTL layout in Takumi

## Adding Fonts

Fonts are handled at the template level via CSS `fontFamily` and are automatically resolved per locale.

### In Templates

Set `fontFamily` on the root element of your template component:

```tsx
const styles = {
  container: { fontFamily: "Inter, system-ui, sans-serif" },
  heading: { fontFamily: "Geist, system-ui, sans-serif" },
};

export default function MyTemplate(props: { title: string }) {
  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>{props.title}</h1>
    </div>
  );
}
```

Takumi fetches Google Font URLs on-demand, so you can use any Google Font as a `fontFamily` value.

### Per-Locale Resolution

The render pipeline resolves fonts per locale through `resolveAssetsForLocale`:

| Locale | Behavior |
| --- | --- |
| `ar*` | Auto-fetches **Noto Sans Arabic** (400, 700) from Google Fonts |
| Other | No auto-resolution — relies on `fontFamily` in the template or custom `fonts` / `fontFamilies` passed to `orchestrateRender` |

### Programmatic: `registerFont()`

Preload a font once and reuse across many renders without re-fetching:

```ts
import { registerFont } from "@stdout-design/core";

const fontData = await fetch("https://fonts.google.com/...").then((r) =>
  r.arrayBuffer()
);

await registerFont({
  name: "Inter",
  data: fontData,
  weight: 400,
  style: "normal",
});
```

The `registerFont` function accepts a `FontDescriptor` (with `name`, `data`, `weight`, `style`) or a raw `ArrayBuffer` / `Uint8Array`. A plain URL string can also be passed — Takumi fetches it on-demand.

### Passing Fonts to `orchestrateRender`

`orchestrateRender` accepts `fonts` and `fontFamilies` to bypass auto-resolution:

```ts
await orchestrateRender({
  ...
  fonts: [{ name: "Inter", data: fontData, weight: 400, style: "normal" }],
  fontFamilies: ["Inter"],
});
```

When `preResolvedFonts` is provided, `resolveAssetsForLocale` skips automatic font loading entirely and uses the supplied values.

### Font Types

Exported from `@stdout-design/core`:

- **`Font`** — `FontDescriptor \| Uint8Array \| ArrayBuffer \| Buffer \| string` (a URL string is fetched on demand)
- **`FontDescriptor`** — `{ name?: string; data: Uint8Array | ArrayBuffer | Buffer | (() => Promise<...>); weight?: number; style?: "normal" | "italic" | "oblique" ... }`
- **`FontResolutionResult`** — `{ fonts: Font[]; fontFamilies: string[] }`
- **`AssetsResolverOptions`** — `{ preResolvedFonts?, preResolvedFontFamilies?, fetchFonts?, localeData?, loadLocaleData? }`

### Dev Server

The dev server serves `.woff2` files with the correct MIME type (`font/woff2`).

### Cache

Font resolutions are cached per locale. Clear both the font and render cache with:

```bash
studio cache clean
```

## Troubleshooting

- `studio dev` requires a scaffolded project — run `studio init` first
- Cache issues: `studio cache clean` clears the render cache
- Batch errors: use `--fail-fast` to stop on first failure
- Type errors: check `tsconfig.json` and template props match `propsSchema`
