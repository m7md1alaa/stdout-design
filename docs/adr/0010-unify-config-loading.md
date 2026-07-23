# 0010. Unify `studio.config.ts` loading between core/CLI and dev-server

## Status

Proposed

## Context

There are two independent implementations of "load and validate `studio.config.ts`":

- `packages/core/src/batch/loaders.ts`'s `loadConfig(rootDir)`: reads the file directly with `readFile` to check existence, then does a plain dynamic `import(pathToFileURL(configPath).href)`, then `studioConfigSchema.safeParse`, throwing `AppError` with `ErrorCode.CONFIG_NOT_FOUND` / `ErrorCode.CONFIG_INVALID` on failure.
- `packages/dev-server/src/template-loader.ts`'s `TemplateLoader.loadConfig()`: loads through the vite-node SSR pipeline (`importFresh` / `runner.executeFile`) instead of a raw dynamic `import`, does the same `studioConfigSchema.safeParse`, but throws `TemplateConfigError` instead of `AppError`, with a differently-formatted issue summary (`summarizeZodIssues` in dev-server vs. the inline `.map().join("; ")` in `loaders.ts`).

Both parse the same schema against the same file, but through different loading mechanisms and with different error types. This means a config validation error looks and behaves differently depending on whether it surfaced from `studio render` (CLI, via `AppError`) or `studio dev` (dev-server, via `TemplateConfigError`) — a config author debugging a typo gets an inconsistent experience purely based on which command they ran, and any future change to error formatting (e.g. improving the issue-path rendering) has to be applied to both independently or it silently re-diverges, the same pattern already seen with `mergeLocale`/`applyLocale` (ADR-0007).

Note that dev-server's use of the vite-node pipeline is not incidental — it needs live invalidation (`reloadAll`) for hot-reload, which core's plain `import()` does not support. This ADR does not propose forcing both onto the same loading _mechanism_; it proposes unifying the parsing/error surface around that difference.

## Decision

Extract the shared parts — schema validation against `studioConfigSchema` and issue-summarization for error messages — into one function in `packages/core/src/shared/config-schema.ts` (or a small adjacent module):

```ts
parseStudioConfig(raw: unknown): { config: StudioConfig } | { issues: string }
```

`loaders.ts#loadConfig` and `TemplateLoader#loadConfig` both call this shared parser after doing their own (necessarily different) module-loading step, and each wraps the result in their own error type (`AppError` vs `TemplateConfigError`) using the same issue-summary string, so the _content_ of a validation error is guaranteed identical between CLI and dev-server even though the error _type_ legitimately differs by consumer.

## Consequences

**Positive**

- A config validation error reads identically whether triggered from `studio render` or `studio dev`, closing the current inconsistency.
- Future improvements to issue formatting apply to both consumers automatically.

**Negative / risk**

- Does not unify the module-loading mechanism itself (plain `import()` vs vite-node) — that's a deliberate scope boundary, not an oversight, since dev-server's hot-reload requirement is a real constraint core's loader doesn't share. If a future need arises for core-side config hot-reloading (e.g. a CLI watch mode), that would be a separate ADR.

## Alternatives Considered

**Make core's `loadConfig` also go through a vite-node-style pipeline** so there is truly one implementation end-to-end. Rejected for now: it would impose vite-node's startup cost on every CLI invocation (`studio render`, `studio init`, etc.) that doesn't need hot-reload, for a benefit (fully identical code path) already achieved at the parsing/error layer by the smaller extraction above.
