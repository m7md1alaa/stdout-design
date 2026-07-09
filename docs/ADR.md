## 1. Package Structure (monorepo, pnpm workspaces)

```
studio/
  packages/
    core/                  # render pipeline, cache, hashing — no UI, no CLI
    cli/                   # `studio` binary — render, dev, init, lint
    dev-server/            # studio dev: HTTP + SSE server, file watcher
    web-ui/                # the Leva-style panel + live canvas (served by dev-server)
    mcp/                   # MCP server exposing core as agent tools
    lint/                  # Takumi-CSS-subset compatibility checker
  templates/               # user-facing starter gallery (bento, milestone, app-store-frame, quote)
  examples/                # a fully working example repo, dogfooded in CI
```

`core` is the only package that touches `@takumi-rs/core`/`@takumi-rs/wasm` directly. Everything else (`cli`, `dev-server`, `mcp`) is a thin client of `core`. This is the single most important structural decision: **one render pipeline, multiple front doors.** No interface gets to have its own rendering logic, ever — that's exactly the preview/export-drift bug from earlier turns, prevented by construction.

---

## 1. The Render Pipeline (`packages/core`)

### 1.1 Two-stage pipeline, two-stage cache

```
TSX + props ──[fromJsx]──▶ { node, stylesheets } ──[renderer.render()]──▶ pixels
              Stage A                              Stage B
```

- **Stage A cache key**: `hash(templateFilePath + templateFileContentHash + propsJSON)`
- **Stage B cache key**: `hash(nodeTreeJSON + stylesheetsJSON + width + height + format)`

Stage B is the valuable cache layer — it's reusable across prop changes that don't affect resolved layout (rare but real), and it's the expensive step (actual layout/text-shaping/compositing). Stage A is cheap (JS execution) but still worth caching to skip redundant `fromJsx` calls during rapid-fire prop edits.

### 1.2 Renderer instance lifecycle

Per Takumi's own performance guidance: **one `Renderer` instance, reused across the process lifetime.** Never instantiate per-request. This is true for `studio dev` (long-lived Node process) and for `studio render --data file.csv` (one process, N renders, one renderer instance, fonts/images preloaded once).

### 1.3 Cache storage: `.studio-cache/`

- On-disk, content-addressed: `.studio-cache/<stage-b-hash>.png`
- A lock file (`.studio-cache/manifest.json`) maps hash → `{ path, createdAt, sizeBytes }`, used for cache eviction (LRU by size budget, configurable, default ~500MB) and for `studio cache clean` / `studio cache stats` CLI commands.
- Cache is gitignored by default; it's a build artifact, not a source artifact.
- Cache is shared between `studio dev` and `studio render` — a template you previewed live and didn't change renders instantly on final export, free.

### 1.4 Two-tier responsiveness in `studio dev`

| Tier | Call | Cost | Trigger |
| --- | --- | --- | --- |
| 1 | `renderer.measure(node, { stylesheets })` | Cheap, no rasterization | Every prop change, no debounce — instant dimension/layout feedback |
| 2 | `renderer.render(...)` | Real cost, cache-checked first | Debounced (default 200ms, per-template configurable), gives the actual pixel preview |

This avoids paying full render cost on every keystroke while keeping layout feedback (e.g. "this card will be 1080×1410, not square, given current text length") truly instant.

### 2.5 No second renderer, ever

The live preview in `studio dev` is **not** a browser-CSS approximation. It is a real Takumi render, served to the browser as bytes. This is the architectural decision that eliminates the preview/export parity problem by construction — there is exactly one renderer in this system. (See §4 for the WASM-in-browser option, which is still "one renderer," just a different deployment of the same engine.)

---

## 2. `studio dev` Server (`packages/dev-server`)

### 2.1 Transport decisions (final)

- **Prop-driven preview**: plain HTTP. Browser debounces locally, POSTs `{templateId, props}` to `localhost:PORT/render`, gets back image bytes (or a cache-hit reference). Request/response is the correct shape here because the _browser_ always knows when something changed — there's no unprompted server event to push.
- **File-watch hot reload**: Server-Sent Events (SSE), one-directional, server → browser only. When chokidar/fs watcher detects a `.tsx` template file change on disk (user editing in their own editor, not through the Leva panel), the server pushes a `{type: "reload", templateId}` event over SSE. Browser re-requests the current prop state against the now-changed template.
- **Explicitly not WebSocket.** Full duplex isn't needed anywhere in this system — preview requests are browser-initiated, reload notifications are server-initiated-but-one-way. SSE covers the push case with less protocol/lifecycle overhead (auto-reconnect built in, plain HTTP under the hood, no separate close/ping handling to write).

### 2.2 Server responsibilities

- Serve `web-ui` static bundle
- `POST /render` — `{templateId, props, preset?}` → image bytes / cache hit
- `POST /measure` — `{templateId, props}` → `{width, height}`
- `GET /templates` — list registered templates + zod-derived prop schemas (same shape the MCP server exposes — see §6)
- `GET /events` (SSE) — file-watch reload notifications
- File watcher on `templates/` and `studio.config.ts`, debounced (avoid double-fire on editor atomic-save patterns)

### 3.3 Caching transport details

- Image bytes returned as the response body directly (`Content-Type: image/png`), not base64-wrapped JSON — avoids the ~33% base64 inflation tax on every preview round-trip.
- Browser-side cache key on `<img>` requests: include the stage-B hash as a query param so the browser's own HTTP cache can short-circuit identical re-requests without even hitting the server (e.g. user reverts a prop to a previous value).

---

## 3. Web UI (`packages/web-ui`)

### 3.1 v1: Node-server-rendered preview (default, ship first)

Browser sends prop state → server renders via `@takumi-rs/core` (multithreaded, full font/CSS support) → returns bytes → browser paints. Simple, fast enough given Takumi's actual perf characteristics, no font-loading burden client-side.

### 3.2 v2 (deferred, not v1): in-browser WASM preview

`@takumi-rs/wasm` could run the _exact same renderer_ client-side, zero network round-trip. Real option, same engine, would feel even more instant. **Deliberately deferred** because the docs reveal two real costs: WASM has no bundled fonts (you'd own client-side font fetching/injection yourself) and is single-threaded (no Rayon) — a throughput and convenience downgrade traded for a latency win. Worth a half-day prototype specifically to measure whether the font-loading friction is tolerable, but not a v1 dependency. The render call in `web-ui` should be abstracted behind a single interface (`previewRender(templateId, props): Promise<Blob>`) from day one specifically so this transport can be swapped later without touching UI code.

### 3.3 Prop panel generation

- **zod is the prop contract**, not bare TypeScript interfaces. One decision, two payoffs: (1) the Leva-style panel is generated by walking the zod schema at runtime — string→text field, enum→dropdown, number→slider with `.min()/.max()` bounds, etc. — with no manual UI wiring per template; (2) the exact same schema validates CLI `-data file.csv` rows and MCP `render`/`render_batch` calls, so a bad data file fails fast with a clear error instead of partway through a 200-image batch.
- Canvas renders at true target pixel dimensions (no scaled-down approximation) per active preset, with multiple presets viewable side-by-side.

---

## 4. CLI (`packages/cli`)

```
studio dev                                    # live studio, opens browser
studio render <template> [props as flags]     # single render
studio render <template> --data posts.csv     # batch, one row = one asset
studio render <template> --data posts.csv --locales en,ar,es --preset ig-square,x-card
                                               # full matrix: rows × locales × presets
studio lint                                   # Takumi-CSS-subset compatibility check, all templates
studio cache stats / studio cache clean       # cache management
studio init                                   # scaffold studio.config.ts + example template
```

### 4.1 Batch execution model

- Concurrency bounded by a configurable worker count (default: CPU core count, since `@takumi-rs/core` already uses Rayon internally — don't double-parallelize on top of an already-multithreaded native call without measuring first).
- **Partial-failure contract, decided up front**: default behavior is _skip-and-report_, not abort-on-first-error. A batch of 500 continues past row 247's bad data, and the command exits non-zero with a manifest of failures (`row, error, templateId`) written alongside successful output. This is the only sane default for unattended/agent-driven runs — silent partial success or total abort on one bad row are both worse outcomes than "did 499/500, here's exactly which one failed and why."
- Output naming is deterministic and predictable: `<template>.<localeOrDefault>.<presetOrDefault>.<rowIndexOrDataKey>.png` — re-running a batch overwrites cleanly, no manual cleanup, no duplicate accumulation.

---

## 5. MCP Server (`packages/mcp`)

Thin wrapper over the same `core` package the CLI uses — same renderer instance lifecycle, same cache, same zod schemas.

### 5.0 Framework choice: fastmcp, not mcp-framework

Considered both `fastmcp` and `mcp-framework`. **fastmcp wins for this package**, for reasons specific to this architecture rather than generic preference:

- **Zod-native tool definitions, matching §4.3 exactly.** fastmcp's `addTool({ parameters: z.object({...}) })` takes the same zod schema already driving the prop panel (§4.3) and CLI batch validation (§5.1) with zero translation layer. mcp-framework also uses Zod but wraps tools in a class-per-file pattern (`MCPTool` base class, `mcp add tool` scaffolding) intended for large, incrementally-grown tool surfaces — overkill for our fixed set of five tools, all thin wrappers over one `core` package.
- **`imageContent` helper matches `render`/`render_batch`'s exact return shape.** Takumi gives raw bytes/a buffer; `imageContent({ buffer })` turns that directly into a spec-compliant MCP image content block, no glue code — keeping `mcp` as thin a client of `core` as §1's "one render pipeline, multiple front doors" principle demands.
- **`reportProgress` fits the batch contract directly.** §5.1's partial-failure manifest and matrix batch jobs (rows × locales × presets) can be long-running; fastmcp's progress-reporting context method lets `render_batch` stream live progress to the calling agent instead of blocking on one large response.
- **Transport: plain `FastMCP` class, `stdio` transport** (fastmcp's default) — this is a locally-run server invoked by Claude Desktop/Claude Code, not a remote multi-client deployment, so `EdgeFastMCP`/`httpStream`/SSE transports (also offered by fastmcp, used for edge/remote scenarios) don't apply here.

### Tools

- `list_templates` → `{ id, propsSchema (JSON-schema-ified zod), description }[]`
- `list_presets` → `{ id, width, height, platform }[]`
- `list_locales` → string[] (from `studio.config.ts`)
- `render` → `{ templateId, props, preset?, locale? }` → file path or base64 (base64 acceptable here since MCP responses are already JSON-wrapped; the HTTP-binary optimization in §3.3 doesn't apply to this transport)
- `render_batch` → `{ templateId, data (array or path), locales?, presets? }` → array of output paths + failure manifest, same partial-failure contract as the CLI

### Design principle

Tool _responses_, not just inputs, are designed for agent consumption: `list_templates` must surface enough schema detail (required/optional, enums, defaults) that an agent can construct a correct `render` call on the first attempt without reading source code. This is treated as an API design task, not plumbing — it's the difference between "an agent can technically call this" and "an agent reliably succeeds unattended."

---

## 6. i18n (first-class, per earlier decision)

- `locales/<locale>.json` files, one per locale, same key structure as the template's prop shape for translatable fields.
- `-locale` / `-locales` flag drives content substitution; RTL text-direction is automatic via Takumi's parley-based text shaping (no per-template RTL logic required for _text_).
- **RTL layout mirroring (not just text direction) is explicitly v1-out-of-scope.** Takumi gives you correct RTL text shaping for free; it does not automatically mirror a grid layout, icon positions, or directional affordances (arrows, chevrons). v1 ships correct text; full automatic layout mirroring is a named v2+ problem, not a half-solved v1 promise.
- Font-fallback check: at `studio dev` startup and at `studio lint` time, walk each template's configured font(s) against each configured locale's sample text and flag missing glyph coverage before a render silently produces tofu boxes. (Implementation detail to spike: skrifa's glyph-coverage introspection vs. a render-and-pixel-check approach — pick whichever has lower false-positive risk once prototyped.)
- Batch matrix: `rows × locales × presets`, single command, predictable output naming (§5.1).

---

## 7. Compatibility Linter (`packages/lint`)

- Source of truth: Takumi's own `/docs/reference#style-properties` page (and Tailwind-class support, since Takumi reimplemented Tailwind itself rather than wrapping the real compiler — its supported utility set is narrower than upstream Tailwind v4 by definition).
- Synced periodically (scripted scrape + diff against last sync, not hand-maintained from memory) so the linter doesn't silently rot as Takumi adds features upstream.
- `studio lint` walks all templates, flags: unsupported CSS properties/selectors, unsupported Tailwind utilities, and (stretch) filter/blur stacking that creates expensive full-viewport composition layers (per Takumi's own perf guidance) — surfaced as a perf warning, not an error.
- Runs in CI on the `examples/` repo as a regression gate.

---

## 8. Explicit Non-Goals (unchanged, restated for completeness)

- No video/audio compositing.
- No hosted/cloud rendering as the default product.
- No drag-and-drop visual builder for non-coders.
- No second rendering engine — Takumi is the only renderer in the system, in any deployment (Node, WASM-future, CLI, MCP).
- No automatic RTL layout mirroring in v1 (text-direction only).

---

---

## 9. Reference Architecture Notes (informed by react-email's monorepo)

react-email's monorepo (`packages/render` + `packages/react-email`, `benchmarks/`, `apps/demo`) independently converged on several structural patterns this spec already committed to, plus two refinements worth adopting before scaffolding begins.

### 10.1 `packages/core` internal split: `shared/` + `node/` + `wasm/`

react-email's `packages/render/src/{browser,edge,node,shared}` is the same fork our `core` package already has to deal with (`@takumi-rs/core` for Node, `@takumi-rs/wasm` for edge/browser, per §4.2's deferred WASM preview). Adopt the same internal layout now, even though `wasm/` stays a near-empty stub until the §11 step 7 spike happens:

```
packages/core/
  src/
    shared/      # cache hashing (§2.3), zod schema handling, fromJsx wrapper,
                 # anything renderer-binding-agnostic
    node/        # @takumi-rs/core binding, Rayon-backed renderer lifecycle (§2.2)
    wasm/        # @takumi-rs/wasm binding — stub until the v2 spike (§11, step 7)
```

This means when the WASM preview spike happens, the seam already exists — it's filling in `wasm/`, not refactoring `shared/` out of code that was never separated. Cheap to do now, expensive to retrofit later.

### 11.2 `benchmarks/` as a checked-in, top-level package

Promote performance measurement from "a one-off spike" (as originally proposed in §2.5 and the WASM discussion) to a permanent, versioned package, following react-email's pattern of committing actual results (`bench-results-100-iterations.json`) alongside the harness, not just the scripts:

```
benchmarks/
  render-core/        # raw renderer.render() timing — isolates Takumi itself,
                       # no server/transport involved
  dev-server-preview/ # full round-trip: debounce + measure() + render +
                       # HTTP transport (§3) — different bottlenecks than render-core,
                       # measured separately on purpose
  results/             # committed JSON output, versioned, diffable in PR review
```

Splitting `render-core` from `dev-server-preview` matters because they answer different questions — "is Takumi itself fast" vs. "does the live studio _feel_ fast" — and conflating them hides which layer a regression came from. Committed results turn perf regressions into something caught in code review (a diff in `results/`), not discovered after a release ships and someone complains the studio feels laggy.

### 11.3 Noted but deliberately deferred

- A shared `packages/ui-shared` for components reused between `web-ui` and any future docs site — not needed until a second consumer of those components actually exists. Mentioned here so it's not forgotten, not because it's needed in v1.
- A dedicated `skills/` directory (react-email has one at repo root, likely Claude-Skills-oriented) — worth a direct look at react-email's actual contents before deciding whether an equivalent serves this project's agent-facing goals, but not yet investigated. Open question, not yet a decision.
- react-email's `docs` app (Mintlify `.mdx` site), `editor` package, and `changesets`/`renovate` tooling are post-PMF accretion on a mature project — explicitly not a v1 checklist item, noted only so their absence here isn't mistaken for an oversight.

---

## 11. Build Order (ties back to earlier Tier plan)

1. **`core`**: `fromJsx` wrapper, two-stage cache, renderer lifecycle management, internal `shared/`+`node/`+`wasm/` split (§10.1). No UI.
2. **`cli`**: `render` (single), `render --data` (batch), partial-failure manifest. This alone is a usable, shippable v0.
3. **`mcp`**: thin wrapper over `core`, same schemas. Pairs naturally with step 2 — both are "headless" front doors to the same engine.
4. **`dev-server` + `web-ui`**: HTTP render endpoint, SSE reload, zod-driven prop panel, `measure()`backed instant layout feedback.
5. **`lint`**: once enough templates exist to make false-positive/negative rate observable.
6. **i18n matrix + font-fallback check**: layer onto the now-stable batch engine from step 2.
7. **WASM-in-browser preview spike**: explicitly scheduled as a side investigation, not a blocking dependency for any of the above.
8. **`benchmarks/` package (§10.2)**: stood up once steps 1–4 exist to measure — `render-core` benchmarks as soon as `core` is usable (can move earlier, right after step 1), `dev-server-preview` benchmarks once step 4 lands. Results committed, not just scripts.

Steps 1–3 are a complete, useful, shippable product on their own — a founder can `npx studio render bento-feature --data posts.csv` and get real output before any UI code exists. That's the right order: prove the core loop headless, then make it pleasant.
