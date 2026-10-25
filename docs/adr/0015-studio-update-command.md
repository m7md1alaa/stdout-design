# 0015. `studio update` — incremental project upgrade command

## Status

Accepted

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
│   │   ├── catalog.ts          # the starter catalog: fonts and `since` per starter
│   │   ├── project-config.ts   # buildProjectConfig() — a project's config from its choices
│   │   ├── serialize-config.ts # serializeConfig() — prints studio.config.ts (shared)
│   │   ├── scaffold.ts         # scaffold(), copyStaticAssets, starter files (shared)
│   │   ├── merge-config.ts     # mergeConfig() — pure config merge (shared)
│   │   ├── version.ts          # compareVersions() (shared)
│   │   └── deps.ts             # updatePackageJsonDeps() — pure dep update (shared)
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

## Amendment (2026-10-25): starters, locales and fonts follow the project's choices

### Context

The poster starters (four templates, Arabic copy, Google Fonts per starter) exposed a gap. `init` and `update` each built "what a project contains" their own way: `init` from the user's answers, `update` from a fixed `getDefaults()` that listed every starter and both locales' fonts. So `update` on a fresh English-only project added Arabic fonts, and brought back starters the user had left out. It also wrote the config with `JSON.stringify` while `init` wrote it by hand.

### Decision

- **One builder.** `buildProjectConfig(version, { starters, locales })` (`init/project-config.ts`) is the only place that decides a project's config. `init` writes its result; `update` builds it for the project's own choices and merges it in with the rules above.
- **Choices are recorded, not guessed.** `init` writes `locales` into `studio.config.ts`. A project without it gets them from `locales/*.json`, and `update` writes them back.
- **Starters carry the version that shipped them.** Each catalog entry (`init/catalog.ts`) has `since`. `update` offers only starters shipped after the project's `scaffoldVersion` and no later than the running CLI, so a starter the user left out at `init` is never re-added.
- **Fonts follow starters.** Each starter lists the families it uses; the config gets only those, for the recorded locales. `update` adds missing families to an entry and never removes or reorders the user's.
- **Template files are now in scope**, replacing the "out of scope for v1" row: a starter `update` registers gets its `.tsx` and its strings in each recorded locale file. Existing files and entries are never overwritten. Files are written before the config, so a failed copy leaves the config unchanged.
- **One serializer.** Both commands print the config with `serializeConfig` (`init/serialize-config.ts`).

### Consequences

- `studio render <id>` in a new project renders every recorded locale, and the dev server lists them, instead of a single `default` render.
- `since` only models additions. Removing or renaming a starter needs a `deprecated` marker like presets have.
