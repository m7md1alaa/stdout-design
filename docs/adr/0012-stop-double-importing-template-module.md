# 0012. Stop double-importing the template module in `studio render`

## Status

Accepted

## Context

CLI's `packages/cli/src/commands/render.ts` calls `importTemplateForBatch(rootDir, resolved.componentPath, templateId)` directly, purely to obtain `propsSchema` for CLI-argument parsing (`parsePropArgs` / `mergeDefaultProps`). It then calls `runBatch(...)`, which — inside `packages/core/src/batch/batch.ts` — calls `importTemplateForBatch` again internally, with the same `rootDir`, `componentPath`, and `templateId` arguments, to actually perform the render.

Every `studio render` invocation therefore dynamically imports the same template module and re-hashes the same file's contents (via `createHash("sha256")` in `loaders.ts`) twice in a single process, for no functional reason — the second call recomputes exactly what the first call already produced.

## Decision

Once the render orchestrator (ADR-0009) exists, give template loading (either the orchestrator itself, or a small standalone `loadTemplate(rootDir, componentPath, templateId)` living in `project/` or `orchestrate/`) a process-local memoization keyed on the resolved absolute file path. A second call for the same path within one CLI invocation becomes a cache hit — no second dynamic `import()`, no second file read, no second hash computation.

## Consequences

**Positive**

- Removes one redundant module load and one redundant `sha256` hash from every `studio render` invocation.

**Negative / risk**

- Minimal — this is a pure performance fix with no behavior change, as long as the memoization key correctly captures anything that should invalidate it (resolved file path is sufficient here since nothing reloads a template mid-CLI-invocation, unlike the dev-server's watch-and-reload case).

## Alternatives Considered

**Have `render.ts` fetch the schema from `runBatch`'s return value instead of importing separately.** Rejected as the primary fix: `runBatch` doesn't currently return the schema, and having `render.ts` continue to call `importTemplateForBatch` directly (but hit a shared cache the second time, inside `runBatch`) requires less restructuring of `runBatch`'s public contract while still eliminating the redundant work. This ADR is sequenced deliberately **after** ADR-0009: doing this before the orchestrator exists means keeping two separate load call sites in sync manually, which is the same drift risk this whole ADR set is trying to close elsewhere.
