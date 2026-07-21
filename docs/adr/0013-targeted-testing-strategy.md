# 0013. Targeted testing strategy for the render pipeline and high-complexity modules

## Status

Accepted

## Context

The codebase has thorough unit tests for cache, validation, and CLI scaffolding, but three critical gaps exist:

1. **No test exercises the real Takumi rendering pipeline.** Every test that touches `fromJsx` (compile) or `Renderer.render` (pixel output) mocks both modules entirely. The actual TSX → compiled node → pixel bytes → file chain has zero verification.
2. **High-complexity modules are entirely untested.** The dev-server orchestrator (`index.ts`, ~20 branches), batch template loader (`loaders.ts`, ~12 branches), CLI render command handler, and the debounce-based `FileWatcher` (7 branches) all have no tests.
3. **The web-ui package has no tests.** This is deferred — it needs a separate Vitest/RTL setup and the risk is visual/styling, not data corruption.

## Decision

Tests are prioritized by **complexity-risk product** (branches × business criticality × integration surface), not by raw line count or coverage percentage:

1. **Full-pipeline integration test** (component → `fromJsx` → `Renderer.render` → file). Uses real Takumi, not mocks. Validates that our code correctly invokes the rendering engine and that the output is a valid PNG. This is the single test that catches "we broke the renderer" regressions.

2. **`batch/loaders.ts`** — Template caching with deduplication, config loading, JSON/CSV data file routing, locale resolution with filesystem fallback. 12 branches, 5 external I/O boundaries. Core batch pipeline.

3. **`cli/src/commands/render.ts`** — CLI command handler that orchestrates 5 subsystems (config loading, template import, prop parsing, batch resolution, output formatting). Low branch count (3) but high integration surface — a regression here is likely to look like a whole-command failure.

4. **`dev-server/src/file-watcher.ts`** — Debounce state machine with per-path timers, chokidar lifecycle, listener dispatch. 7 branches with mutable instance state. The watcher is the dev server's most error-prone subsystem because silent failures (missed change events) are invisible to users.

5. **`dev-server/src/index.ts`** — Dev server orchestrator with ~20 branches, 4 HTTP endpoints, SSE streaming, cache management. Highest raw complexity but lowest risk of silent regression in the tests we can reasonably write, since the route handlers are thin Hono wrappers around already-unit-tested `orchestrateRender`.

**Deliberately deferred:** web-ui (needs Vitest/RTL infrastructure), trivial utilities (<3 branches, no business logic), full e2e CLI invocation tests (high fragility for coverage that overlaps with the above).

## Consequences

**Positive:**

- The full-pipeline test catches the most dangerous regression class (Takumi integration breakage) that no existing test can surface.
- Loaders tests cover the batch pipeline's data-flow layer, which has the most branching logic outside of the web-ui.
- The CLI render handler test validates the command-most-likely-to-break-under-refactoring.

**Negative / risk:**

- The full-pipeline integration test (`full-pipeline.integration.ts`) must run in isolation — it does not mock Takumi modules, which conflicts with Bun's process-global `mock.module` state set by the existing unit tests. It is excluded from the default `bun test` glob (named `.integration.ts` instead of `.test.ts`) and invoked via `bun test:integration` (core package) or `bun test ./packages/core/src/__tests__/full-pipeline.integration.ts`.
- No web-ui tests means visual regressions remain manual-verification-only until Vitest/RTL is set up.
