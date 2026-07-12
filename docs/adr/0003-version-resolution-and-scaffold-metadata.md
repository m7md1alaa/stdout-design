# ADR 0003 — Version resolution and scaffold metadata strategy

**Status:** accepted

When `studio init` creates a project, it writes `"@stdout-design/cli": "^x.y.z"` into the project's `package.json`. The question is: which `x.y.z`, where does it come from, and what else should we store for future upgrade tooling.

## Considered options

### Source of truth for the version

**A. Local package.json** — read `@stdout-design/cli/package.json` from node_modules via `createRequire`. This is what `getScaffoldVersion()` currently does. It's fast, works offline, and is always correct when the CLI is installed as a workspace package. But when running via `npx @stdout-design/cli@latest`, the local version is the version currently installed — which is what the user asked for. There is no real problem with the local version: if the user ran `npx @stdout-design/cli@0.1.5`, the local version IS `0.1.5`. The only edge case is when the CLI is run from source in this monorepo, where the version might be `0.0.0` or a prerelease — but that's a developer scenario, not a user scenario.

**B. npm registry fetch** — like `create-email` does. Fetches `https://registry.npmjs.org/@stdout-design/cli/latest` at runtime. Adds latency, requires network, complicates offline scenarios. The benefit is marginal because `npx` already ensures the correct version is installed before the CLI runs. The only scenario where registry fetch helps is if the user installed an old version globally and runs it without `npx` — but that's a user error, not a design problem.

**Decision:** Use local `package.json` version. It's more robust (works offline, no latency, no network dependency, no registry parsing), and in practice it's always the version the user intended since `npx/fetch` ensures the requested version is what's installed. Do NOT fetch from the npm registry.

### Range strategy

The scaffolded `package.json` should use `"@stdout-design/cli": "^x.y.z"` (caret range). This auto-accepts patches and minor updates, which is the npm convention. Explicit pinning would cause users to miss updates and would be inconsistent with how every other scaffold tool works.

### Scaffold metadata

The generated `studio.config.ts` should include a `scaffoldVersion` field set to the CLI version that created the project. This enables a future `studio upgrade` command to detect the installed version, compare with the scaffold version, and suggest or automate upgrades. The field is a string, optional in the type, and silent if absent — existing projects without it don't break.

```ts
export default defineConfig({
  scaffoldVersion: "0.1.5", // set by studio init
  // ... rest of config
});
```

### Offline behavior

Since we use the local version directly, there is no offline concern. The version is always available because it's the CLI's own version.

## Consequences

- No network request at scaffold time — faster, more reliable.
- The local version is always authoritative. No need for a fallback.
- `scaffoldVersion` field in config enables future upgrade tooling without guessing.
- The field is additive — no migration burden for existing projects.
- If the CLI is run from source (development), the version may be `0.0.0` or a prerelease. This is acceptable because scaffold during development is a developer action, not a user action.
