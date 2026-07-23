# 0015. `studio update` — incremental project upgrade command

## Status

Proposed

## Context

`studio init` only runs once — if `studio.config.ts` exists, it bails. Projects created with older CLI versions have no way to bring scaffolded files up to date. ADR-0003 anticipated this by storing `scaffoldVersion` in `studio.config.ts`, and the glossary defines the term with "enables future `studio upgrade`."

A separate command avoids confusing the "create new project" flow with the "update existing project" flow.

## Decision

Add `studio update [--yes]` as a separate command. It reads the existing project, compares `scaffoldVersion` against the current CLI version, and applies deltas.

### Merge strategy

| Concern | Behavior |
| --- | --- |
| `scaffoldVersion` | Always overwrite with current CLI version |
| Static assets (`tsconfig.json`, `.gitignore`, `types.d.ts`) | Overwrite entirely — CLI-owned |
| `package.json` deps | Update only `@stdout-design/cli` range to `^currentVersion`. Leave all other deps untouched. |
| `defaultPreset` | Preserve user's value. If the preset id no longer exists in merged presets → fall back to CLI's current default. |
| `outDir` / other scalar fields | Preserve user's value. Never auto-migrate defaults. |
| `presets[]` | Merge: keep user's presets (add `deprecated` flag for known-deprecated ones), add new CLI default presets the user doesn't already have. |
| `templates{}` | User wins on key conflict. Only add templates the user doesn't already have registered. |
| Template `.tsx` files | Out of scope for v1. |

### Deprecation

A `deprecated?: boolean` field is added to the `Preset` interface in `@stdout-design/core`. The CLI maintains a `DEPRECATED_PRESET_IDS` set. When `studio update` finds a deprecated preset, it sets `deprecated: true`.

### Missing `scaffoldVersion`

Pre-ADR-0003 projects have no `scaffoldVersion`. `studio update` treats this as version 0 — all changes are applied.

### Prompt model

Default: show a summary and prompt confirmation (`Apply these changes? [Y/n]`). With `--yes` or in CI: skip prompt and apply directly.

### Architecture

```
packages/cli/src/
├── commands/
│   ├── init/
│   │   ├── scaffold.ts       # scaffold(), getDefaults(), copyStaticAssets (shared)
│   │   ├── merge-config.ts   # mergeConfig() — pure config merge (shared)
│   │   └── deps.ts           # updatePackageJsonDeps() — pure dep update (shared)
│   ├── init.ts               # init command handler
│   └── update.ts             # update command handler (new)
└── index.ts                   # registers `studio update`
```

## Consequences

**Positive**

- One-command path to catch up with new CLI releases without re-init.
- Merge semantics are simple and predictable: user customizations are never silently overwritten.
- The `deprecated` flag on `Preset` is data-driven and pipeline-visible.
- Missing `scaffoldVersion` is handled gracefully.

**Negative / risk**

- Template `.tsx` file migration is deferred. If a built-in template's props API changes, `studio update` won't update template code.
- The `deprecated` flag on `Preset` is an additive type change. Existing configs without the field are fine.

## Alternatives Considered

**Flags on `studio init` (`--update` / `--force`).** Rejected: conflates two distinct intents (create vs. upgrade) and `init` asks first-time questions that don't apply to upgrades.

**Template-diff regeneration.** Rejected for v1: too much friction for a one-command operation. Programmatic merge is safe enough for the fields touched.
