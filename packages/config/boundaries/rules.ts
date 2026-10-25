/**
 * The repo's module boundaries as data. `boundaries.test.ts` walks every
 * source file and fails on any import these tables don't allow, so a new
 * edge is a reviewed change to this file, not a judgment call in review.
 * See docs/adr/0008-reslice-core-by-layer.md and
 * docs/adr/0019-template-interface-and-enforced-boundaries.md.
 */

/** Folders directly under `packages/core/src`. A folder not listed here fails the test. */
export const CORE_LAYERS = [
  "shared",
  "engine",
  "project",
  "assets",
  "cache",
  "orchestrate",
  "batch",
  "og",
] as const;

export type CoreLayer = (typeof CORE_LAYERS)[number];

/** `any`: value and type imports. `types`: `import type` only, erased at build. Unlisted: forbidden. */
type EdgeKind = "any" | "types";

export const CORE_LAYER_DEPS: Record<
  CoreLayer,
  Partial<Record<CoreLayer, EdgeKind>>
> = {
  assets: { engine: "types", shared: "any" },
  batch: {
    assets: "any",
    cache: "any",
    orchestrate: "any",
    project: "any",
    shared: "any",
  },
  cache: { project: "any", shared: "any" },
  engine: { shared: "any" },
  og: { engine: "any", shared: "any" },
  orchestrate: { assets: "any", cache: "any", engine: "any", shared: "any" },
  project: { shared: "any" },
  shared: {},
};

/** Layers that never touch disk, network, or the runtime: no `node:` or `bun` modules. */
export const IO_FREE_LAYERS: readonly CoreLayer[] = ["shared"];

/** Every workspace, by package name. A workspace not listed here fails the test. */
export const WORKSPACES = [
  "@stdout-design/cli",
  "@stdout-design/config",
  "@stdout-design/core",
  "@stdout-design/dev-server",
  "@stdout-design/web-ui",
  "web-docs",
] as const;

export type Workspace = (typeof WORKSPACES)[number];

/**
 * Which workspaces each one may import, always through the target's
 * `exports` map. web-ui is a browser bundle that talks to dev-server over
 * HTTP only. The CLI finds dev-server at runtime (ADR-0004).
 */
export const WORKSPACE_DEPS: Record<Workspace, readonly Workspace[]> = {
  "@stdout-design/cli": ["@stdout-design/core", "@stdout-design/dev-server"],
  "@stdout-design/config": [],
  "@stdout-design/core": [],
  "@stdout-design/dev-server": ["@stdout-design/core"],
  "@stdout-design/web-ui": [],
  "web-docs": ["@stdout-design/core"],
};

/**
 * Template projects: a `studio.config.ts` plus a `templates/` folder, laid
 * out the way `studio init` scaffolds them. Templates are user-facing code,
 * so they may only reach the authoring surface.
 */
export const TEMPLATE_PROJECTS = ["packages/cli/template", "examples"] as const;

export const TEMPLATE_ALLOWED_IMPORTS: readonly string[] = [
  "@stdout-design/cli/schema",
  "@stdout-design/core/schema",
  "react",
  "zod",
];

export interface BoundaryException {
  /** Repo-relative path of the importing file. */
  file: string;
  specifier: string;
  reason: string;
}

/** Imports that break a rule on purpose. The test also fails when one goes unused. */
export const BOUNDARY_EXCEPTIONS: readonly BoundaryException[] = [
  {
    file: "examples/templates/docs-og.tsx",
    reason:
      "Previews the docs site's own OG card in the studio; the component lives with the docs route that serves it.",
    specifier: "../../apps/web-docs/src/components/og/docs-template",
  },
];
