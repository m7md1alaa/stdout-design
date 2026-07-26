# 0017. OG image subpath export for `@stdout-design/core`

## Status

Accepted

## Context

Every web project needs OG images (1200×630 social preview cards). `@stdout-design/core` already has all the primitives — `compileTemplate`, `renderToPixels`, font registration — but no OG-specific entry point. Instead, OG image generation is handled ad-hoc by each consumer.

Two concrete examples of this duplication:

1. **Fumadocs docs site** (`apps/web-docs/src/app/og/docs/[...slug]/route.tsx`) uses `fumadocs-ui/og/takumi`'s `DefaultImage` component and `takumi-js/response`'s `ImageResponse` directly — neither is distributed by or related to `@stdout-design/core`.

2. **Any future user** who wants OG images with `@stdout-design/core` must either: write their own OG card from scratch (redesigning the same 1200×630 layout every time), or import Fumadocs' template (which isn't documented as part of this project).

The missing piece is not a new rendering capability — `takumi-js` already turns JSX into images — but rather a **shippable, documented OG card template** and a **discoverable import path** for it.

## Decision

Add a `@stdout-design/core/og` subpath export that ships a `StandardOgTemplate` component — a ready-to-use 1200×630 OG card with configurable `title`, `description`, and `siteName` props.

The subpath follows the same pattern as the existing `@stdout-design/core/schema`:

- A focused subpath for a specific concern (schema validation vs OG image templates)
- Framework-agnostic (works anywhere Takumi JSX is supported)
- No new dependencies beyond what core already requires

### What ships

```
packages/core/src/og/
├── index.ts        # Re-exports the public API
└── template.tsx    # StandardOgTemplate component + OgTemplateProps type
```

### What does NOT ship (by design)

**No framework-specific route handler** (e.g. `createNextJsOgRoute()`). Per ADR-0004's principle, framework adapters stay out of core when only one framework adapter exists. Next.js route wiring is documented as a usage pattern, not coded as a helper. If a second framework (Hono, Express) shows demand, the seam becomes real and an adapter can be extracted.

**No `createOgResponse()` wrapper.** A wrapper around Takumi's `ImageResponse` would be ~2 lines of delegation — too shallow to justify its own entry point. Users call `new ImageResponse(...)` directly; it's already the right interface.

## Consequences

**Positive**

- A user who wants OG images writes a route handler in ~6 lines: import the template + ImageResponse, get page data, return the response.
- The OG card has a single source of truth in the repo (one component, used by all consumers).
- The subpath pattern (`core/og`) mirrors `core/schema`, making the project's conventions consistent.
- Zero new dependencies — the component uses the same `tw=` shorthand and `style={}` patterns as all example templates.

**Negative / risk**

- The template is opinionated (dark theme, pink accent, centered layout). Users who want a different look write their own component; this doesn't prevent that, but they may expect `@stdout-design/core/og` to cover every style. Mitigated by documenting "bring your own component" in the user guide.
- The OG card falls back on system fonts (`system-ui, -apple-system, sans-serif`) since it can't know what fonts the consumer has registered. Users who want custom fonts should register them via `registerFont` and update the component's `fontFamily`. This is documented as the "fonts" guide page.

## Alternatives Considered

**Pipeline-aware `renderOgImage()` entry point.** A function that coordinates validate → resolve assets → compile → render → wrap in Response. Rejected because it duplicates `orchestrateRender`'s job with only a different output format (Response vs file). The real depth is the template component, not the orchestration.

**Next.js-specific `createOgHandler()` in a separate `@stdout-design/next` package.** Rejected because only one framework adapter (Next.js) exists — the seam is hypothetical per DEEPENING.md ('one adapter means a hypothetical seam'). Premature until a second framework shows demand.

**Keep the status quo (no OG subpath).** Rejected: leaves every user duplicating the same OG card layout, with no discoverable entry point or documented pattern.
