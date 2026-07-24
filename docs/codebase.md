1. Monorepo Type This is a Turborepo monorepo using Bun workspaces as the package manager. Specifically:

- Turborepo for task orchestration (turbo.json at root, turbo v2.10.6 in root devDependencies).
- Bun workspaces for package linking ("workspaces": ["apps/_", "packages/_"] in root package.json).
- Bun as the package manager ("packageManager": "bun@1.3.13" in root package.json, confirmed by bunfig.toml using the "isolated" linker).
- No Changesets (/.changeset/ directory does not exist).
- No Nx (nx.json does not exist).
- No pnpm (pnpm-workspace.yaml does not exist).
- No Lerna (lerna.json does not exist). The project was scaffolded via Better-T-Stack (see /Users/mohammedalrabrabah/dev-projects/Personal/stdout-design/bts.jsonc), which bundles turborepo as an addon.

2. Packages & Directories There are 5 packages in /Users/mohammedalrabrabah/dev-projects/Personal/stdout-design/packages/. The apps/* workspace glob exists but no apps/ directory is present. Package Directory private Published to npm? @stdout-design/cli /Users/mohammedalrabrabah/dev-projects/Personal/stdout-design/packages/cli No (public) Yes @stdout-design/core /Users/mohammedalrabrabah/dev-projects/Personal/stdout-design/packages/core No (public) Yes @stdout-design/dev-server /Users/mohammedalrabrabah/dev-projects/Personal/stdout-design/packages/dev-server No (public) Yes @stdout-design/web-ui /Users/mohammedalrabrabah/dev-projects/Personal/stdout-design/packages/web-ui No (public) Yes @stdout-design/config /Users/mohammedalrabrabah/dev-projects/Personal/stdout-design/packages/config Yes ("private": true) No (shared config only) All 4 publishable packages set "publishConfig": { "access": "public" } in their package.json.
3. Version Management Current Versions (from package.json files) Package Version @stdout-design/cli 0.2.10 @stdout-design/core 0.2.10 @stdout-design/dev-server 0.2.10 @stdout-design/web-ui 0.2.10 @stdout-design/config 0.0.0 (private, not published) The root package.json has no version field (it is "private": true). Version Sync Mechanism There is no Changesets integration. Instead, versioning is handled by a custom script: File: /Users/mohammedalrabrabah/dev-projects/Personal/stdout-design/scripts/version-sync.ts

- Ultracite (Oxlint + Oxfmt) for linting/formatting — root scripts: check / fix
- Knip for dead code detection — /Users/mohammedalrabrabah/dev-projects/Personal/stdout-design/knip.json
- TypeScript 7 with a shared base config at /Users/mohammedalrabrabah/dev-projects/Personal/stdout-design/packages/config/tsconfig.base.json

Build Tools per Package Package Build Tool Config @stdout-design/cli tsdown /Users/mohammedalrabrabah/dev-projects/Personal/stdout-design/packages/cli/tsdown.config.ts @stdout-design/core tsdown /Users/mohammedalrabrabah/dev-projects/Personal/stdout-design/packages/core/tsdown.config.ts @stdout-design/dev-server tsdown /Users/mohammedalrabrabah/dev-projects/Personal/stdout-design/packages/dev-server/tsdown.config.ts @stdout-design/web-ui tsc -b && vite build /Users/mohammedalrabrabah/dev-projects/Personal/stdout-design/packages/web-ui/vite.config.ts @stdout-design/config N/A Shared tsconfig only
