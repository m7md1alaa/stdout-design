# stdout-design

A CLI toolkit for rendering TSX components into social/marketing images.

## Language

**Studio**: The CLI binary (`studio`). The front door to the system. _Avoid_: Tool, app, program

**Studio project**: A directory with `studio.config.ts` and template files that gets created by `studio init`. The unit of work — a user has one per repo. _Avoid_: workspace, package, scaffolded repo

**Scaffold**: The process of creating a new studio project from templates. Run by `studio init`. _Avoid_: init, generate, bootstrap (as nouns)

**Template**: A TSX component that defines rendered visual output. Has a `propsSchema` (Zod) and a default export. Lives in a project's `templates/` dir or the CLI's `template/` dir. _Avoid_: Component (ambiguous — in this context, "component" means Takumi node, not template)

**Template directory** (`template/` in the CLI package): The source-of-truth files that get copied during scaffold. Not a separate publishable package. _Avoid_: starter, boilerplate, example

**Scaffold version**: The CLI version that created a project. Stored in `studio.config.ts` as `scaffoldVersion`. Used by `studio update` to compare against the current CLI version. _Avoid_: version, created-version

**Bootstrap dependencies**: Dependencies the CLI needs to run itself: `commander`, `ora`, `picocolors`, `@clack/prompts`. Small, stable. _Avoid_: CLI deps, tool deps

**Framework dependencies**: Dependencies the scaffolded project owns: `@stdout-design/dev-server`, `@stdout-design/web-ui`, `takumi-js`, `react`. The CLI does NOT declare these as its own deps — it finds them in the project's `node_modules` at runtime. _Avoid_: runtime deps, transitive deps

**Bootstrap** (as verb): The CLI's role — it is a thin bootstrapper, not a framework. It creates projects and delegates rendering/core logic to `@stdout-design/core` and `@stdout-design/dev-server`. _Avoid_: framework, platform, engine

**Live preview**: The `studio dev` experience — a dev server + web UI for interactively editing templates. Requires `@stdout-design/dev-server` and `@stdout-design/web-ui` in the project. _Avoid_: playground, editor, studio (ambiguous)

**Registry fallback**: When the npm registry is unreachable during scaffold, the CLI falls back to its local `package.json` version instead of failing. The local version is the "last known good" fallback. _Avoid_: offline mode, fallback version

**Scaffold warnings**: Messages printed during scaffold when something is unexpected but not blocking: directory exists, offline mode active, TypeScript config exists. Not errors. _Avoid_: warnings, notices

**Studio update**: The `studio update` command that upgrades an existing studio project's scaffolded files to match the current CLI version. Updates `scaffoldVersion`, static assets, `package.json` deps, and merges new default presets/templates into the config. _Avoid_: upgrade, migrate, refresh

**Deprecated preset**: A preset (in `studio.config.ts`) that the CLI no longer recommends. Marked with `deprecated: true` during `studio update`. The rendering pipeline may emit warnings for deprecated presets. _Avoid_: removed, deleted, old

**Agent Skill**: A `SKILL.md` file (at `skills/studio/SKILL.md`) installed into an agent's scope by the `skills` CLI (vercel-labs/skills). Contains instructions for how the agent should use `studio`. _Avoid_: skill (ambiguous), instruction set, prompt, agent config

**Skill installer**: The module in `@stdout-design/cli` (`src/lib/skill.ts`) that detects whether the agent skill is installed, prompts the user, and runs `skills add`. _Avoid_: skill manager, agent setup, skill helper
