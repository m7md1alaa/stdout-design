# 0006. One `openCache(rootDir, overrides)` helper, not three cache-directory resolutions

## Status

Accepted

## Context

Three call sites each independently perform the same three-step sequence — resolve the cache directory path, construct a `RenderCache`, call `init()` — with subtly different path-joining logic:

- CLI's `packages/cli/src/commands/cache.ts` (`cacheStats` and `cacheClean`, duplicated within the same file): `path.resolve(rootDir ?? process.cwd(), ".studio-cache")`.
- `packages/core/src/batch/batch.ts`: `cacheDirOverride ?? path.resolve(rootDir, ".studio-cache")`.
- `packages/dev-server/src/index.ts`: `cacheDir ?? path.join(rootDir, ".studio-cache")`.

`path.resolve` and `path.join` behave differently when `rootDir` is relative versus absolute, so these three copies are not even guaranteed to agree on the resulting path today, independent of the `.studio-cache` literal itself being duplicated three times (see ADR-0005, which addresses the literal; this ADR addresses the surrounding open/init/close ceremony).

## Decision

`packages/core/src/cache/` exports:

```ts
openCache(rootDir: string, overrides?: { cacheDir?: string; maxSizeMB?: number }): Promise<RenderCache>
```

internally built on `resolveProjectPaths(rootDir).defaultCacheDir` (ADR-0005) plus `new RenderCache(...)` plus `init()`, returning a ready-to-use, already-initialized instance. `cacheStats`, `cacheClean`, `runBatch`, and dev-server's `createDevServer` all call this instead of hand-rolling path resolution and initialization.

## Consequences

**Positive**

- Removes three copies of default-path logic that could silently disagree.
- A future default-path change (or a change to `RenderCache` construction, e.g. new required options) becomes a one-line change instead of a three-site coordinated edit.

**Negative / risk**

- Low risk — purely additive wrapper around the existing, unchanged `RenderCache` class. Callers still own `close()` themselves; this ADR only consolidates the open path, not lifecycle ownership.

## Alternatives Considered

**Fix only the `path.resolve` vs `path.join` inconsistency** without adding a shared helper. Rejected: fixes today's specific mismatch but leaves the same three-call-site duplication in place for the next change to cache construction.
