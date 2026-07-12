# 0009. Introduce a single Render Orchestration entry point in core

## Status

Proposed

## Context

Three call sites in this codebase independently implement the same underlying
operation — "resolve inputs, check cache, compile, render, return/write
bytes":

- `packages/core/src/batch/render-one.ts` (CLI batch path): has font/lang
  resolution, does **not** call `validateProps`.
- `packages/core/src/batch/single.ts` (CLI single-render path): calls
  `validateProps`, has **no** font resolution, and does **not** use the
  render cache at all.
- `packages/dev-server/src/index.ts`'s `/render` handler: has neither font
  resolution nor validation-after-locale-merge.
- `packages/dev-server/src/index.ts`'s `/measure` handler: a fourth, partial
  copy — its request schema doesn't even accept a `locale` field.

These have already diverged in exactly the ways you'd expect from four
unsynchronized implementations of one operation. Every future correctness
fix (locale merging, font resolution, validation timing, cache-key
derivation) has to be manually re-applied at up to four call sites, and
evidently isn't being kept in sync — that's the direct cause of the
dev-server Arabic-font gap and the measure/render dimension mismatch
documented separately.

## Decision

`packages/core` exposes one orchestration entry point:

```ts
orchestrateRender(input: OrchestrateInput): Promise<RenderResult>
orchestrateMeasure(input: OrchestrateInput): Promise<MeasureResult>
```

Both share one internal prep pipeline: resolve locale → merge props → resolve
fonts/lang → validate merged props → derive cache key → check cache →
compile (cache-aware) → render or measure.

CLI's single-render command, CLI batch's per-cell step inside `runBatch`, and
dev-server's `/render` and `/measure` handlers all become thin callers of
this orchestrator. None of them re-implement cache-key derivation, locale
merging, or font resolution directly.

## Consequences

**Positive**

- Font resolution, validation timing, and cache-key derivation exist in
  exactly one place; a fix applied once is visible to CLI single-render, CLI
  batch, and dev-server preview simultaneously.
- `/measure` gains locale-aware sizing "for free," fixing the dimension
  mismatch against `/render` documented in the dev-server audit.

**Negative / risk**

- This is a real breaking change to `RenderOneInput` and `SingleInput`
  shapes — every caller needs to be migrated in the same change, not
  incrementally.
- Batch's per-cell loop currently resolves fonts once per run outside the
  loop for performance; switching to "resolve per cell" via the shared
  orchestrator requires the orchestrator to own its own per-locale asset
  cache (see ADR-0007) or batch rendering will regress in speed.

## Alternatives Considered

**Port the missing pieces individually** (add font resolution to
dev-server, add validation timing fix to batch, add `locale` to
`/measure`'s schema) without a shared entry point. Rejected: fixes the
currently-known divergences but does nothing to stop a fifth call site (e.g.
a future MCP-based preview) from re-implementing the same operation
incorrectly again.
