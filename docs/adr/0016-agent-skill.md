# 0016. Agent skill for AI coding agents

**Status:** Proposed

## Context

AI coding agents (Claude Code, Codex, Copilot, opencode, etc.) are increasingly the primary interface for developers working with CLI tools. When an agent encounters a codebase using `studio`, it has no context about how to use the CLI, what config format to expect, or what commands are available.

The `skills` ecosystem (vercel-labs/skills) provides a standard way to distribute agent instruction sets via GitHub repos. A SKILL.md file teaches agents how to use a specific tool. The CLI can prompt users to install this skill during project setup.

## Decision

Add a **Studio agent skill** and a **skill installer** module to the CLI.

### What ships

1. **`skills/studio/SKILL.md`** — A single markdown file in the monorepo with YAML frontmatter (`name: studio`, `description: ...`). Contains agent instructions for using the `studio` CLI, its commands, config format, and common workflows. Discovered by `skills add m7md1alaa/stdout-design`.

2. **`packages/cli/src/lib/skill.ts`** — A reusable module with three functions:
   - `isSkillInstalled(pm)` — runs `skills list --json`, parses output for `{ name: "studio" }`
   - `promptToInstallSkill()` — `@clack/prompts` select: Yes / No
   - `maybeInstallSkill({ pm, quiet, shouldInstall })` — orchestrates detect → prompt → install

3. **Two entry points:**
   - `studio init --install-skill` — offers the skill during project creation (after scaffold + deps)
   - `studio skill install` — standalone command for existing projects, no scaffold required

### How it works

The skill installer uses `package-manager-detector` (already a dependency per ADR-0004) to detect the user's package manager. It maps to the correct `dlx` equivalent via a 4-line lookup table:

| PM   | Command                                       |
| ---- | --------------------------------------------- |
| npm  | `npx skills add m7md1alaa/stdout-design`      |
| pnpm | `pnpm dlx skills add m7md1alaa/stdout-design` |
| bun  | `bunx skills add m7md1alaa/stdout-design`     |
| yarn | `yarn dlx skills add m7md1alaa/stdout-design` |

The install command is plain `skills add <repo>` — no `--agent` flags. The `skills` CLI auto-detects installed agents.

### Prompt model

| Mode | Behavior |
| --- | --- |
| Interactive | Detects if already installed → if no, prompts "Install the studio agent skill?" |
| `--yes` (CI) | Skips prompt entirely |
| `--install-skill` | Skips prompt, installs directly (opt-in) |

`--install-skill` is only on `studio init`. `studio skill install` is always interactive unless `--yes` is passed.

### CLI architecture

```
packages/cli/src/
├── lib/
│   ├── skill.ts              # isSkillInstalled, promptToInstallSkill, maybeInstallSkill
│   └── runner.ts             # unchanged
├── commands/
│   ├── init.ts               # calls maybeInstallSkill if --install-skill or interactive
│   └── skill.ts              # new — studio skill install command handler
└── index.ts                  # registers studio skill install + --install-skill flag on init
```

### Dependency decision

**No new dependencies.** The skill installer uses `package-manager-detector` (already in deps) with a manual `dlx` mapping. `nypm` is not imported — it would add ~60KB for a function replaceable with 4 lines, violating the ADR-0004 principle of keeping the CLI minimal (~20 deps).

## Consequences

**Positive**

- Agents that encounter a studio project know how to use the CLI, reducing onboarding friction.
- The skill is versioned alongside the CLI in the same repo — SKILL.md updates can ship with CLI releases.
- Zero new dependencies. The install logic is ~50 lines.
- Fallback: if `skills` CLI is missing, `npx` auto-downloads it. If the network is unavailable, the install fails gracefully with a clear message.

**Negative / risk**

- SKILL.md must be kept in sync with CLI changes. A stale skill teaches agents incorrect commands.
- The `skills` CLI is a runtime dependency of the skill installer (run via `dlx`, not bundled). If it breaks or changes its API, the install may need updating.
- Does not validate that the skill content matches the installed CLI version. A future `studio skill update` command could address this.

## Alternatives considered

**`nypm` for `dlxCommand`.** Rejected: adds 60KB dependency for a 4-line mapping. ADR-0004 established that the CLI stays minimal. The manual mapping is simple, testable, and has no version-churn risk.

**Agent multiselect prompt.** Rejected: asks a question the user may not know the answer to ("which agents do you use?") and adds friction to init. The `skills` CLI auto-detects agents — let it handle this.

**Embed in `studio update`.** Rejected for v1: `studio update`'s concern is config and deps migration. A standalone `studio skill install` covers the "existing project" case without conflating concerns.

**Separate repo for the skill.** Rejected: same-repo keeps the skill and CLI in lockstep. The `skills` CLI discovers from `skills/` by convention — no separate release pipeline needed.
