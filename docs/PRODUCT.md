> Write your marketing assets as TSX. Render them like code. Ship them like an agent task.

---

## 1. The Problem (positioned correctly)

In 2026, a huge and growing class of builders ships entire products through AI coding agents — Claude Code, Cursor, Lovable — without a traditional engineering team and without a marketing team. They are founders, indie hackers, and small teams who are "near code": they read diffs, they run CLIs, they live in a terminal, but they are not necessarily classically trained engineers.

When this person needs a marketing asset — an App Store screenshot, an Instagram milestone card, an X launch post, a Product Hunt banner, a promo video — they hit a dead workflow:

- **Design tools (Figma/Canva) require leaving the codebase entirely**, manually recreating UI that already exists in their app, and manually keeping it in sync every time the product changes.
- **Generic "HTML-to-image" APIs (Bannerbear, Abyssale, html2img, OG IMPACT)** solve image _rendering_, not asset _authoring_. They assume you already have a template designed in their dashboard. They are SaaS products built for marketing teams with budgets, not for a solo founder's repo.
- **Component rendering engines (Satori, Takumi, `next/og`)** solve the hard rendering problem — JSX/CSS to pixels, fast, no headless browser — but they are _libraries_, not _workflows_. There is no live preview, no prop-editing UI, no CLI, no batch/data-driven generation, and no agent interface on top of them.
- **Video tools (Recordly, Screen Studio, Remotion)** fall into two camps: the screen-capture tools (Recordly, Screen Studio) require manual recording and post-processing in a GUI, while composition engines like Remotion are overkill for the actual need — "five App Store screenshots, an Instagram milestone card, and a 30-second promo video of my app in action, all by tonight."

**The result:** the same person who built the product's UI in TSX rebuilds a worse, drifting copy of that UI by hand in a separate design tool every single time they want to post something. When they need a video, they record manually, hunt for the right screen recording tool, and spend an hour tweaking playback speed and cursor styling in After Effects or CapCut — or they skip it entirely. The design system that is the single source of truth for the product is _not_ the single source of truth for how the product is marketed, and neither is the codebase when it comes to video.

This was true in 2023 too. What's different now is _who's affected_. The population of people building products solo, through agents, without a design or marketing function, has exploded — and that population is uniquely well-positioned to want a code-native tool, because they already live in TSX and in the terminal. The gap was always there; the audience that would actually adopt the fix is new.

---

## 2. Why this hasn't been built

Two groups have historically owned each half of this problem, and neither had reason to build the bridge:

- **Frontend/design-system engineers** had the components but were building internal tooling for _their own_ company's social/marketing team — a different department, with different tools (Figma, Canva, a SaaS dashboard), so the "studio" stayed a one-off internal script, never generalized or open-sourced.
- **Marketing tool vendors** built the opposite direction: a templating UI for non-technical marketers, with the renderer as an implementation detail behind an API.

The founder-with-an-agent persona collapses both roles into one person who is comfortable in code but has no time, budget, or desire for either side's tools. That person needs something that has never had a reason to exist before: a **dev-native, agent-drivable, component-reuse-first social and video asset tool** that lives in their repo and treats their own TSX as the design system, not a SaaS template library.

---

## 3. Positioning

**What it is:** An open-source, local-first studio that renders your own TSX components into finished social/marketing images and GIFs — _and_ automatically captures cinematic promo videos from your running app or from headless AI-driven flows — with a live prop-editing UI for iteration, a CLI for scripting, and an MCP server so any AI agent can generate assets on command.

**What it is not:**

- Not a full-featured video editor with timelines, transitions, and audio mixing. Video capture is constrained to what matters: flawless screen recording, intelligent cursor rendering, and algorithmic zoom to actions. Audio is captured but not edited. Downstream video editing (Premiere, CapCut, DaVinci) remains the user's responsibility if they want music or effects.
- Not a hosted SaaS. No accounts, no billing, no cloud rendering by default. It runs in your repo, like a dev dependency.
- Not a no-code design tool. The user writes TSX. This is for people who are near code, not people avoiding it.
- Not a new rendering engine. Takumi already solved JSX/CSS → pixels, fast, no headless browser. We build _on_ Takumi, not instead of it.

**One-line pitch:** _Storybook for images, Screen Studio for videos, but both live in your repo and speak to your agents._

---

## 4. Core Architecture

```
your-repo/
  studio.config.ts          # template registry, output presets, locales
  templates/
    bento-feature.tsx       # plain TSX + Tailwind, typed props
    milestone-card.tsx
    app-store-screenshot.tsx
  captures/
    onboarding-flow.ts      # Playwright script for --headless video capture
    feature-demo.native     # native capture config for --native mode
  data/
    posts.csv               # batch render data
    milestones.json
  locales/
    en.json
    ar.json
    es.json
  out/                      # rendered output (gitignored)
```

- **Render engine (static assets):** Takumi under the hood. We do not reimplement JSX→pixel rendering — that's a solved, MIT-licensed problem. Our value is everything Takumi doesn't try to be: a workflow.
- **Capture engine (video):** Two mutually exclusive recording modes that standardize on a shared post-processing pipeline:
  - **Native mode (`--native`):** Swift/C++ bindings (ScreenCaptureKit on macOS, Graphics Capture on Windows) for pixel-perfect OS-level recording, perfect cursor fidelity, and the ability to capture non-browser apps. Requires a physical screen.
  - **Headless mode (`--headless`):** Playwright-driven browser automation with human-like cursor easing, runs in CI/CD and Docker, suitable for web-app demos. The agent writes the navigation script; the CLI executes and captures in parallel.
- **Template contract:** a template is a plain React component with typed props (`title: string`, `stat: number`, `image: string`, `locale?: string`). No custom DSL — this is critical so AI agents can generate new templates by pattern-matching existing ones in the repo without hallucinating new syntax.
- **Four interfaces over one core:**
  1. `studio dev` — live preview + prop editor (Leva-style panel, React-Email-Studio-style live canvas)
  2. `studio render` — CLI, single or batch, for scripting/CI (static images)
  3. `studio capture` — CLI, dual-mode (native or headless), for video generation
  4. MCP server — same render and capture cores, exposed as agent tools

---

## 5. Feature Plan

### Tier 0 — Build first (proves the concept, smallest useful slice)

#### Static Image Generation

- **CLI single render:** `studio render bento-feature --title "..." --stat "10k users" --out post.png`
- **CLI batch render from data file:** `studio render bento-feature --data posts.csv --out-dir ./out/` — one row per asset. This is the single highest-leverage feature for someone generating "10 milestone cards for the last 10 shipped features" in one command, and it's what makes agent-driven generation trivial (the agent just writes the data file).
- **MCP server, minimal tool set:**
  - `list_templates` — names + prop schemas, so an agent knows what's renderable without reading source
  - `render` — template + props → file
  - `render_batch` — template + data → files
  - `list_presets` — output sizes available per platform

#### Video Capture (Tier 0.5 — core mechanics, minimal features)

- **CLI native capture:** `studio capture --native --out demo.mp4` — prompts user to select a window, records until Esc, applies post-processing
- **CLI headless capture:** `studio capture --headless --script onboarding-flow.ts --out demo.mp4` — agent (or human) provides a Playwright script, CLI executes and records in parallel, generates telemetry.json for cursor data
- **Unified telemetry pipeline:** Both modes produce standardized raw_source.mp4 + telemetry.json (click coordinates, timestamps, cursor paths)
- **Basic compositor:** Applies smoothed cursor rendering, algorithmic auto-zoom on click targets, and Apple-style visual polish (drop shadows, squircle clipping)

### Tier 1 — The live studio (makes iteration pleasant)

#### Static Assets

- `studio dev`: hot-reload on TSX save, live preview at true target pixel size
- Auto-generated Leva-style prop panel from the template's prop types — text fields, color pickers, sliders, image droppers — no manual UI wiring per template
- Side-by-side multi-preset preview (see the IG square and the X card at once)
- Export button that calls the exact same render path as the CLI (no preview/export drift)
- "Reverse Engineer" button: copies the exact CLI command needed to reproduce the current visual state

#### Developer Experience

- **One-time setup wizard:** `npx @stdout-design/cli init` scans for existing Tailwind/design-system config, auto-scaffolds `studio.config.ts`, and adds the CLI as a devDependency. Every subsequent `npx studio` or `studio` commands run from node_modules with zero lag and offline capability.
- **AST-driven prop parsing:** No secondary schema validation layer (no Zod). Studio reads TypeScript interfaces directly from template files to generate CLI validation, MCP enum tools, and UI dropdowns automatically.
- **Automatic mock data injection:** When booting `studio dev`, undefined props are intelligently populated based on naming conventions (`avatarUrl` gets a placeholder image, `revenueStat` gets a sample number).
- **Typo-tolerant CLI:** Levenshtein distance checks catch user errors. Typing `studio render btn-feature` when the template is `bento-feature` prompts: "Template 'btn-feature' not found. Did you mean 'bento-feature'? (y/n)"

### Tier 2 — Platform-aware output

- **Multi-target presets baked into templates, not bolted on:** one template → `-preset instagram-square`, `-preset instagram-story`, `-preset x-card`, `-preset app-store-6.7`, `-preset play-store-feature`, each with correct aspect ratio and safe-zones (e.g., IG Story's top/bottom UI-overlap exclusion zones, App Store device-frame requirements)
- **Live safe-zone overlays in studio dev:** Toggling a preset shows the exact platform UI hitboxes so you see in real time whether your text will be obscured by native chrome on Instagram or X.
- **Device-frame compositing as a first-class template type:** drop in a real app screenshot, get it composited inside an accurate phone frame with a headline above it. This is _the_ App Store/Play Store screenshot use case, and currently done by hand in Figma by almost everyone. Ship real, accurately-proportioned frame assets (not freehand-drawn approximations) or document clearly that users must supply licensed frame assets themselves, since device silhouettes can carry trademark/IP restrictions.
- **Animated GIF/WebP export**, scoped tightly to what Takumi's time-axis already supports (CSS keyframes/transitions baked into the template) — not arbitrary physics-based animation. Keep the scope boundary explicit so it doesn't creep into Remotion's territory.

#### Video Enhancements

- **Video preset parity with images:** `-preset twitter-video`, `-preset tiktok`, `-preset youtube-short` with correct frame rates and safe zones
- **Capture data watch mode:** Running `studio capture --watch onboarding-flow.ts` monitors the Playwright script for changes, re-executes and re-renders on every save — tight feedback loop for tweaking automation flows
- **Deterministic output manifests:** Batch renders generate `studio-manifest.json` — a structured map of every generated asset's path and metadata, ready for the agent to pipe into a tweet generator or PR template

### Tier 3 — Internationalization (your priority — first-class, not bolted on)

This deserves to be a core pillar, not an afterthought, because the same forces that motivate the whole tool — solo builders, agent-driven workflows, low overhead — also describe most indie products' actual user base: global from day one, with no localization team.

- **Locale-aware data files:** `locales/en.json`, `locales/ar.json`, `locales/es.json` — same template, same props _shape_, different string values, selected via `-locale` or batched via `-locales en,ar,es`
- **RTL support as a default, not a special case:** Takumi's text shaping (via parley/skrifa) already supports RTL — the studio should pass locale → text-direction automatically rather than requiring per-template RTL logic
- **Tofu-detection engine:** Because i18n is a core pillar, Studio actively checks the target locale against the configured font. If a template attempts to render Arabic text with a font missing those glyphs, it halts and flashes a prominent warning to prevent shipping broken character boxes.
- **Batch-render across locales × presets in one command:** `studio render milestone-card --data milestones.json --locales en,ar,es --preset instagram-square,x-card` → full matrix output, named predictably (`milestone-card.en.instagram-square.png`, etc.)
- **Font-fallback awareness:** flag at render time (or at `studio dev` time) when a template's configured font doesn't cover a target locale's script, so you don't silently ship tofu boxes in Arabic or CJK text
- **MCP-exposed locale matrix:** `list_locales` tool, and `render_batch` accepting a `locales` array, so an agent can be told "make this milestone card in our 5 supported languages" and just do it
- **Data watch mode extends to locales:** Updating a translation in `locales/ar.json` instantly re-renders and overwrites the `.ar.png` assets in the output folder

### Tier 4 — Agent Excellence

Studio treats AI agents as first-class citizens, not an afterthought:

- **`scaffold_template` MCP tool:** Agents don't have to guess the template architecture. When a user prompts "Make me a launch banner," the agent uses this tool to drop a perfectly structured, ready-to-render TSX file into the project with correct prop types and sample data.
- **Self-healing renders:** If an agent hallucinates a prop (e.g., passes `--subtitle` instead of `--description`), the MCP server catches the TypeScript mismatch, rejects the render, and returns the exact required interface so the agent can self-correct immediately.
- **Agent-readable output manifests:** Batch renders generate `studio-manifest.json`. This gives the agent a structured, programmatically readable map of exactly where every generated asset lives, allowing it to instantly pipe those paths into an auto-tweet script, PR description, or changelog post.
- **Feature parity across all three interfaces (UI/CLI/MCP):**

| Capability | studio dev (Live UI) | studio render / capture (CLI) | MCP (Agent) |
| --- | --- | --- | --- |
| Prop Editing | Visual sliders & color pickers | Terminal flags (--prop) | JSON object payloads |
| Batch Processing | Dropdown toggle for data rows | --data posts.csv or --script flow.ts | render_batch / capture executors |
| Validation | Red error boundaries on canvas | Strict exit code (1) | Error strings returned to LLM |
| Multi-Targeting | Side-by-side visual matrix | --preset all | presets: ["all"] |
| Video Modes | Live preview of capture method | --native or --headless | capture_mode: "native" \| "headless" |

### Tier 5 — Polish / ecosystem

- Starter template gallery: bento feature card (Apple-style — your own reference point), milestone/stat card, quote card, before/after, changelog entry, App Store screenshot frame
- Starter capture scripts: onboarding flow (Playwright), feature walkthrough, error-recovery sequence
- Asset management: drop-in fonts/logos/screenshots without a build step
- `studio.config.ts` validation + helpful errors when a template's props don't match its data file (catches mistakes before a 50-image batch render fails halfway through)

---

## 6. Video Capture: The Technical Substrate

The video capture pipeline is designed to be **agent-drivable and headless-capable** while maintaining the studio aesthetic (smooth cursor, intelligent zoom, professional polish) without requiring manual GUI interaction.

### The Two Capture Modes

**Mode A: Native (`--native`)**

```bash
studio capture --native --out promo.mp4
```

- Prompts user to select a window
- Starts a 3-second countdown (giving time to raise app to foreground)
- Records until Esc is pressed
- Produces: `raw_source.mp4` + `telemetry.json` (click/scroll coordinates, cursor path, timestamps)
- **Primary value:** Perfect system-level fidelity. No ghost cursors. Captures native notifications, OS overlays (Raycast, Spotlight), and non-browser apps.
- **Limitation:** Requires a physical display. Will error in headless Docker.

**Mode B: Headless (`--headless`)**

```bash
studio capture --headless --script onboarding-flow.ts --out promo.mp4
```

- Takes a user-provided (or agent-generated) Playwright script
- Boots a headless Chromium instance with human-cursor easing library injected
- Executes the script, records the window in parallel, logs all interactions to telemetry.json
- Produces: `raw_source.mp4` + `telemetry.json` (same shape as native mode)
- **Primary value:** 100% automated, deterministic, CI/CD-ready. Perfect for "auto-generate a demo video on each commit."
- **Limitation:** Constrained to browser-based web apps. Cannot capture OS-level UI.

### The Unified Compositor

Regardless of input source, both modes standardize on:

- `raw_source.mp4`: The unstyled screen recording
- `telemetry.json`: Timestamps, click coordinates, cursor paths, scroll events

The Compositor Engine ingests these two artifacts and applies:

- **Smoothed cursor rendering:** Interpolates cursor position from telemetry, eliminates jitter, and applies easing
- **Algorithmic auto-zoom:** Detects clicks in telemetry, intelligently zooms toward the interaction (30% zoom on click, easing back to 1x over 400ms)
- **Stylized overlays:** Apple-style drop shadows, squircle clipping, fade-in/out transitions
- **Output flexibility:** Exports to MP4, WebM, or GIF; configurable frame rate and duration

### Playwright Script Contract (for `--headless`)

The agent writes Playwright scripts that follow a simple contract:

```typescript
// onboarding-flow.ts
import { Page } from "playwright";

export async function recordScript(page: Page) {
  // Studio CLI injects human-cursor easing and click-tracking telemetry
  await page.goto("https://myapp.com");
  await page.click('button[data-testid="start"]');
  await page.type("input", "hello world");
  await page.click('button[data-testid="submit"]');
  // Studio captures all of this with perfect cursor interpolation
}
```

No special APIs needed. Plain Playwright. The CLI wraps it with telemetry hooks before execution.

---

## 7. Deliberately Out of Scope

- **Full-featured video editing.** Audio mixing, color grading, effects, transitions, music sync — all downstream. Studio captures and does intelligent cursor/zoom styling; Adobe/DaVinci/CapCut handles the rest.
- **Hosted/cloud rendering as the default product.** Local-first is the actual value prop versus Bannerbear/Abyssale; a cloud product competes with them and loses the thing that makes this interesting.
- **Drag-and-drop visual builder for non-coders.** That's Canva's job; diluting toward that audience weakens the "near code" positioning that makes this useful to its actual users.
- **A new rendering engine (static) or capture/compositor engine (video).** Takumi and screen-capture libraries already won these; reinventing wastes the head start. We orchestrate, not reimagine.

---

## 8. Why now, specifically

The rendering technology (Takumi), screen-capture libraries (ScreenCaptureKit, Graphics Capture, Playwright), the protocol for agent tool use (MCP), and the cinematic screen-recording aesthetic (Screen Studio, Recordly) all became mature and widely adopted very recently. But the more important shift is the audience: in 2026, "I built my product with Claude Code/Cursor/Lovable and now I need to post about it — screenshots, videos, multilingual versions" describes a fast-growing, currently-unserved group of builders who are fluent enough in code to use a CLI and write TSX, but have no design, video, or marketing tooling of their own. Nobody has shipped the dev-native, agent-drivable, component-reuse-first bridge for images _and_ video — not because the ideas are hard, but because the people who could've built them weren't, until very recently, also the people who needed them.

The confluence of three forces makes this moment unique:

1. **AI agents can now write capture scripts and data files programmatically.** An agent that understands your Playwright tests can auto-generate a demo video from them. An agent can write a CSV row. Neither required manual intervention.
2. **Indie builders have become the primary use case for marketing tools.** The Figma-to-Instagram pipeline was built for marketing teams. The Recordly aesthetic was built for SaaS teams with budgets. This tool is built for the person who is the entire team.
3. **Code-native tools now have permission to be code-native.** Five years ago, "write TSX to make a social media post" sounded absurd. In 2026, it's the obvious solution for someone who already writes TSX every day.
