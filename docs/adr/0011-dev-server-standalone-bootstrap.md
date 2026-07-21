# 0011. Dev-server owns its own standalone bootstrap; CLI calls it instead of re-implementing it

## Status

Accepted

## Context

`packages/dev-server/src/serve.ts` and `packages/cli/src/commands/dev.ts`
are near-duplicates. Both:

- call `createDevServer(...)`,
- call `Bun.serve({ fetch: server.app.fetch, port: server.port })`,
- log an identical "Studio dev server running on http://localhost:PORT"
  message,
- install identical `SIGINT`/`SIGTERM` handlers that call `server.close()`
  and `process.exit(0)`.

The only real differences are how `rootDir` and `port` are resolved
(`serve.ts` uses `resolveStudioRoot` plus `process.argv`/the `PORT` env var;
`dev.ts` uses CLI-parsed options) and that `dev.ts` additionally resolves
`webUiDist` via `findWebUiDist()`.

Because the shutdown/signal-handling logic is duplicated rather than
shared, a future fix to that logic (e.g. a shutdown race, or adding a
timeout before force-exit) has to be applied twice, with no mechanism
ensuring it is.

## Decision

`packages/dev-server` exports a new entry point:

```ts
startStandaloneServer(options: DevServerOptions): Promise<{ close: () => Promise<void> }>
```

which internally owns `Bun.serve`, the startup log line, and
`SIGINT`/`SIGTERM` handling. `serve.ts`'s `import.meta.main` block and
CLI's `dev.ts` both become thin: each resolves its own options (argv/env
vars for `serve.ts`, commander-parsed options plus `findWebUiDist()` for
`dev.ts`), then calls `startStandaloneServer(options)` and does nothing
else.

## Consequences

**Positive**

- One copy of shutdown/signal-handling logic instead of two, removing the
  risk of one copy being fixed later and the other silently left behind.
- `serve.ts` and `dev.ts` shrink to option-resolution only, making the
  actual difference between "run dev-server standalone" and "run dev-server
  from the CLI" (which is just how options are gathered) visible in the
  diff instead of buried in duplicated server-lifecycle code.

**Negative / risk**

- None expected if done as a pure extraction — the two existing call sites'
  observable behavior does not need to change, only where the shared code
  lives.

## Alternatives Considered

**Leave both as-is and just keep them manually in sync.** Rejected: this is
the same failure mode already observed with `mergeLocale`/`applyLocale`
(ADR-0007) and the three cache-path resolutions (ADR-0006) — duplicated
lifecycle code in this codebase does not, in practice, stay in sync.
