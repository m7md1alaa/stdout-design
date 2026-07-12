# ADR 0004 — Package dependency boundary: CLI is a thin bootstrapper

**Status:** accepted

**Supersedes:** ADR 0001 §8 (corrected the "devDep used at runtime" label but didn't resolve the actual dependency question for dev-server and web-ui)

## Context

`@stdout-design/cli` has three entry points:

- `studio render` — uses `@stdout-design/core` (rendering engine, cache). No extra deps.
- `studio dev` — imports `@stdout-design/dev-server` at runtime (vite-node SSR, file watcher, static server). The dev-server transitively depends on `vite`, `vite-node`, `@vitejs/plugin-react`, `chokidar`, and `hono`.
- `studio init` — uses `@clack/prompts`, `ora`, `picocolors`. Minimal.

Currently, `@stdout-design/cli`'s `package.json` does NOT list `@stdout-design/dev-server` or `@stdout-design/web-ui` as runtime dependencies — they're devDependencies (workspace protocol). The scaffolded project compensates by listing them as direct deps.

This creates an invisible contract: `studio dev` works only when run inside a scaffolded project (or the monorepo) where dev-server happens to be in `node_modules`. If someone installs `@stdout-design/cli` globally and runs `studio dev` in a bare directory, it fails with a confusing import error.

## Considered options

### A. CLI declares dev-server and web-ui as hard runtime dependencies

The CLI adds `@stdout-design/dev-server` and `@stdout-design/web-ui` to its `dependencies`. `studio dev` always works, anywhere. The scaffolded project's `package.json` only needs `@stdout-design/cli` and `takumi-js`.

**Cost:** every install of `@stdout-design/cli` pulls in `vite` (50+ transitive deps), `vite-node`, `react`, `tailwindcss`, etc. — even for users who only want `studio render` in CI. The `@stdout-design/cli` install size jumps from ~20MB to ~200MB.

**Rejected because:** the majority of production use cases for `studio` are CI/CD pipelines that run `studio render` only. Making every CI install pull 200MB of dev UI is unacceptable.

### B. CLI lists them as optional peer dependencies, project provides them (status quo-ish)

The CLI declares `@stdout-design/dev-server` and `@stdout-design/web-ui` as optional peer dependencies. The scaffolded project includes them as direct deps. When they're absent, `studio dev` shows a helpful message instead of crashing.

**Cost:** peer dep warnings during install, extra complexity in the error path.

**Rejected because:** optional peer deps are poorly supported across package managers (pnpm ignores them, bun warns, npm v7+ errors). The error-message approach is table-stakes and doesn't need a formal mechanism.

### C. CLI stays minimal, project owns framework deps, CLI shows a helpful error when deps are missing (chosen)

The CLI does NOT declare dev-server or web-ui. When `studio dev` is invoked and the import fails (or when dev server creation fails), the CLI catches the error and prints:

```
studio dev requires a scaffolded project with @stdout-design/dev-server installed.
Run studio init to create one, or install it manually.
```

The scaffolded project lists `@stdout-design/dev-server` and `@stdout-design/web-ui` as direct dependencies — same as today. The CLI itself stays at ~20 dependencies.

This matches the pattern used by every major scaffold tool (create-next-app, create-vite, create-email).

## Decision

**Option C.** CLI stays minimal. The scaffolded project owns all framework dependencies. The CLI provides a helpful error when deps are missing rather than crashing with an unhelpful import error.

The specific changes:

1. `@stdout-design/cli` does NOT add dev-server or web-ui to `dependencies`. (No change — this is the current state, now recorded as a decision.)
2. `packages/cli/src/commands/dev.ts` wraps the import of dev-server in a try-catch and prints a guided error message on failure.
3. The scaffolded template `package.json` continues to list `@stdout-design/dev-server`, `@stdout-design/web-ui`, and `takumi-js` as direct dependencies. (No change.)
4. `takumi-js` stays in the scaffolded project because template authors import it directly (`import { createElement, css } from "takumi-js"`). It's a template-authoring dep, not a CLI dep.

## Consequences

- UX improvement: `studio dev` in a non-project directory says "run studio init" instead of throwing a raw `ERR_MODULE_NOT_FOUND`.
- CLI install stays tiny (~20 deps) for CI/CD users.
- Scaffolded projects are self-contained — they declare everything they need.
- If a user globally installs the CLI and wants `studio dev`, they must still run `studio init` first (or manually install the deps). This is the same friction as every other scaffold tool.
- No peer dep warnings, no package-manager-specific behavior to maintain.
