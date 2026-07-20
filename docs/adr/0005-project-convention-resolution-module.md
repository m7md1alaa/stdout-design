# 0005. Extract Project Convention Resolution as its own core module

## Status

Proposed

## Context

Knowledge of "where things live in a studio project" is currently spread across several independent string literals in three packages:

- `packages/dev-server/src/file-watcher.ts` hardcodes `${rootDir}/templates` and `${rootDir}/studio.config.ts` as watch paths.
- `packages/dev-server/src/index.ts` hardcodes `${rootDir}/locales/${locale}.json` inside `applyLocale`.
- `packages/dev-server/src/template-loader.ts` independently hardcodes `resolve(rootDir, "studio.config.ts")`.
- `packages/dev-server/src/serve.ts` hardcodes the project-root search (`studio.config.ts` and `examples/studio.config.ts`) inside `resolveStudioRoot`.
- `packages/core/src/batch/loaders.ts` independently hardcodes `path.resolve(rootDir, "studio.config.ts")` and `path.resolve(rootDir, "locales/${code}.json")`.
- The default cache directory name `.studio-cache` is duplicated three times with three slightly different path-joining calls: `batch.ts` (`path.resolve(rootDir, ".studio-cache")`), dev-server's `index.ts` (`path.join(rootDir, ".studio-cache")`), and CLI's `cache.ts` (`path.resolve(rootDir ?? process.cwd(), ".studio-cache")`).

This is the most probable root cause of a separately-identified bug: `FileWatcher` watches `templates/` and `studio.config.ts` but never `locales/`, so locale file edits never hot-reload during `studio dev`. There is no single place that owns "here is everything a studio project contains" that would have forced the question of whether locale files need watching too.

## Decision

`packages/core/src/project/` exports one resolver:

```ts
resolveProjectPaths(rootDir: string): {
  configPath: string;
  templatesDir: string;
  localesDir: string;
  defaultCacheDir: string;
}
```

Every consumer that currently inlines one of these paths — dev-server's `resolveStudioRoot` (in `serve.ts`), `FileWatcher`, `TemplateLoader`, and `index.ts`, CLI's `cache.ts`, and core's `batch.ts` and `loaders.ts` — calls this resolver instead of constructing the path itself.

## Consequences

**Positive**

- Fixes the locale-hot-reload gap as a direct side effect: `FileWatcher` receives `localesDir` from the same call that gives it `templatesDir`, removing the blind spot that let it be omitted.
- A future convention change (e.g. a configurable `templatesDir`, or renaming the default cache directory) becomes a one-file change instead of a grep across two packages.

**Negative / risk**

- Low risk — this is additive and mechanical. The only care needed is making sure every existing inline path construction is actually replaced, not left as a second, now-inconsistent source of truth alongside the new resolver.

## Alternatives Considered

**Fix only the missing `locales/` watch path** as a point fix in `file-watcher.ts`. Rejected: addresses the one bug found so far but leaves the other four duplicated path constructions in place, including the three different `.studio-cache` path-joining calls, which is exactly the kind of drift this ADR set is meant to stop accumulating.
