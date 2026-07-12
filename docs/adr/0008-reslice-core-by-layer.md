# 0008. Re-slice `packages/core/src` by layer, not by runtime target

## Status

Proposed

## Context

The current top-level split under `packages/core/src` is `node/` (cache +
renderer + Takumi shim), `batch/` (matrix expansion, CLI-batch concerns),
and `shared/` (config schema, error codes, logger, types, validation). This
is a split by "does this touch the filesystem," not by responsibility —
visible in the fact that `batch/batch.ts` already imports from
`../node/render-cache.js` despite living outside `node/`, and in the fact
that the asset resolver introduced in ADR-0007 does I/O (font fetching,
locale file reads) but conceptually belongs with `shared/`'s "used by
everyone" role, not `node/`'s "Node-specific primitives" role.

As more shared concerns are extracted (asset resolution, project
conventions, render orchestration), the `node/` vs `batch/` vs `shared/`
boundary gets harder to reason about, not easier, because none of the three
names describe a layer of the actual render pipeline.

## Decision

Re-slice `packages/core/src` into layers that mirror the actual dependency
order of a render:

- `engine/` — compile, render, measure, and the Takumi type shim. No cache,
  no filesystem access beyond what Takumi itself requires. (Today's
  `renderer.ts` and `takumi-types-shim.ts`, plus `shared/render.ts`.)
- `assets/` — locale merge, font/lang resolution (ADR-0007). Depends on
  `engine/`'s types only.
- `cache/` — cache-keys, compile-cache, render-cache, metadata-store,
  fs-store, eviction-coordinator, concurrency-limiter. Cross-cutting: used
  by orchestration, not a peer pipeline stage between `assets/` and
  `engine/`. (Today's `node/*` minus `renderer.ts` and the Takumi shim.)
- `orchestrate/` — the render/measure orchestrator (ADR-0009). The only
  module that imports from `engine/`, `assets/`, and `cache/` together.
- `batch/` — slimmed to matrix expansion, output naming, and manifest
  writing. Delegates all per-cell render work to `orchestrate/` instead of
  compiling/rendering/caching directly.
- `project/` — project convention resolution (ADR-0005).
- `shared/` — stays genuinely shared and I/O-free: config-schema,
  error-codes, logger, types, validation. Nothing in this folder touches
  disk or network, ever, going forward.

## Consequences

**Positive**

- Matches the actual data-flow of a render (project conventions → assets →
  engine, coordinated by orchestration, backed by cache) rather than an
  incidental "which runtime touches this" split.
- Makes the I/O-free guarantee for `shared/` explicit and enforceable — a
  future PR adding disk access to something in `shared/` is a visible
  layering violation, not a judgment call.

**Negative / risk**

- This is a real breaking change to every import path in `packages/cli` and
  `packages/dev-server`. Needs to land as one coordinated change with
  `packages/core/src/index.ts`'s public re-exports updated in the same
  commit — a slow, file-by-file drift would leave the package in a
  half-migrated, harder-to-reason-about state for longer than doing it in
  one pass.

## Alternatives Considered

**Keep `node/` and `batch/` as-is, just add `assets/` and `project/`
alongside them.** Rejected: this papers over the fact that `node/` never
described a layer in the first place, and would leave the cross-cutting
role of the cache (used by orchestration, not "in between" assets and
engine) implicit rather than named.
