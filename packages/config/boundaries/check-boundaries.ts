import { existsSync, readdirSync, readFileSync } from "node:fs";
import { isBuiltin } from "node:module";
import path from "node:path";

import {
  BOUNDARY_EXCEPTIONS,
  CORE_LAYER_DEPS,
  CORE_LAYERS,
  IO_FREE_LAYERS,
  TEMPLATE_ALLOWED_IMPORTS,
  TEMPLATE_PROJECTS,
  WORKSPACE_DEPS,
  WORKSPACES,
} from "./rules.js";
import type { BoundaryException, CoreLayer, Workspace } from "./rules.js";
import { listSourceFiles, scanImports } from "./scan-imports.js";
import type { ImportEdge } from "./scan-imports.js";

export interface BoundaryReport {
  coreLayers: string[];
  workspaces: string[];
  templates: string[];
  /** Workspaces on disk missing from `WORKSPACES`, or listed but gone. */
  undeclaredWorkspaces: string[];
  unusedExceptions: string[];
}

interface PackageJson {
  name?: string;
  workspaces?: string[];
  exports?: Record<string, unknown>;
}

const TEST_FILE = /\.test\.tsx?$/u;
const WORKSPACE_GLOB_SUFFIX = "/*";

const readPackageJson = (dir: string): PackageJson =>
  JSON.parse(readFileSync(path.join(dir, "package.json"), "utf-8"));

const isCoreLayer = (name: string): name is CoreLayer =>
  (CORE_LAYERS as readonly string[]).includes(name);

const isWorkspace = (name: string): name is Workspace =>
  (WORKSPACES as readonly string[]).includes(name);

const isRuntimeModule = (specifier: string): boolean =>
  specifier === "bun" ||
  specifier.startsWith("bun:") ||
  specifier.startsWith("node:") ||
  isBuiltin(specifier);

const isInside = (dir: string, target: string): boolean => {
  const relative = path.relative(dir, target);
  return (
    relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
  );
};

/** `@scope/name/sub/path` → `{ name: "@scope/name", subpath: "./sub/path" }`. */
const splitPackageSpecifier = (
  specifier: string
): { name: string; subpath: string } => {
  const segments = specifier.split("/");
  const nameLength = specifier.startsWith("@") ? 2 : 1;
  const rest = segments.slice(nameLength).join("/");
  return {
    name: segments.slice(0, nameLength).join("/"),
    subpath: rest ? `./${rest}` : ".",
  };
};

/** Workspace package name → absolute directory, from the root `workspaces` globs (`dir/*` only). */
const discoverWorkspaces = (repoRoot: string): Map<string, string> => {
  const found = new Map<string, string>();
  for (const pattern of readPackageJson(repoRoot).workspaces ?? []) {
    if (!pattern.endsWith(WORKSPACE_GLOB_SUFFIX)) {
      throw new Error(`Unsupported workspace pattern: ${pattern}`);
    }
    const parent = path.join(
      repoRoot,
      pattern.slice(0, -WORKSPACE_GLOB_SUFFIX.length)
    );
    for (const entry of readdirSync(parent, { withFileTypes: true })) {
      const dir = path.join(parent, entry.name);
      if (entry.isDirectory() && existsSync(path.join(dir, "package.json"))) {
        const { name } = readPackageJson(dir);
        if (name) {
          found.set(name, dir);
        }
      }
    }
  }
  return found;
};

interface CheckContext {
  repoRoot: string;
  toRepoPath: (file: string) => string;
  /** True when the import is listed in `BOUNDARY_EXCEPTIONS`; records the exception as used. */
  isExcepted: (file: string, specifier: string) => boolean;
}

const coreEdgeViolation = (
  coreSrc: string,
  file: string,
  layer: CoreLayer,
  { specifier, typeOnly }: ImportEdge
): string | undefined => {
  if (IO_FREE_LAYERS.includes(layer) && isRuntimeModule(specifier)) {
    return `"${layer}" is I/O-free and may not import runtime modules.`;
  }
  if (!specifier.startsWith(".")) {
    return undefined;
  }
  const [targetLayer, ...targetRest] = path
    .relative(coreSrc, path.resolve(path.dirname(file), specifier))
    .split(path.sep);
  if (targetLayer === layer) {
    return undefined;
  }
  const allowed =
    targetLayer && targetRest.length > 0 && isCoreLayer(targetLayer)
      ? CORE_LAYER_DEPS[layer][targetLayer]
      : undefined;
  if (allowed === "any" || (allowed === "types" && typeOnly)) {
    return undefined;
  }
  return allowed === "types"
    ? `"${layer}" may import "${targetLayer}" with \`import type\` only.`
    : `"${layer}" may not import "${targetLayer}".`;
};

/** Core layers (ADR-0008). Entry points at the src root and tests are exempt. */
const checkCoreLayers = (context: CheckContext): string[] => {
  const coreSrc = path.join(context.repoRoot, "packages/core/src");
  const violations: string[] = [];
  for (const file of listSourceFiles(coreSrc)) {
    const [layer, ...rest] = path.relative(coreSrc, file).split(path.sep);
    const exempt =
      !layer ||
      rest.length === 0 ||
      layer === "__tests__" ||
      TEST_FILE.test(file);
    if (exempt) {
      continue;
    }
    if (!isCoreLayer(layer)) {
      violations.push(
        `${context.toRepoPath(file)}: "${layer}" is not a core layer. Add it to CORE_LAYERS and CORE_LAYER_DEPS.`
      );
      continue;
    }
    for (const edge of scanImports(file)) {
      const violation = coreEdgeViolation(coreSrc, file, layer, edge);
      if (violation && !context.isExcepted(file, edge.specifier)) {
        violations.push(
          `${context.toRepoPath(file)} → ${edge.specifier}: ${violation}`
        );
      }
    }
  }
  return violations;
};

const checkWorkspaceDeclarations = (
  workspaceDirs: Map<string, string>
): string[] => [
  ...[...workspaceDirs.keys()]
    .filter((name) => !isWorkspace(name))
    .map((name) => `${name}: on disk but missing from WORKSPACES.`),
  ...WORKSPACES.filter((name) => !workspaceDirs.has(name)).map(
    (name) => `${name}: in WORKSPACES but not on disk.`
  ),
];

const workspaceEdgeViolation = (
  workspace: { name: Workspace; dir: string },
  file: string,
  specifier: string,
  exportsOf: (name: string) => string[]
): string | undefined => {
  if (specifier.startsWith(".")) {
    return isInside(workspace.dir, path.resolve(path.dirname(file), specifier))
      ? undefined
      : `reaches outside ${workspace.name}. Import the package instead.`;
  }
  const target = splitPackageSpecifier(specifier);
  if (!isWorkspace(target.name)) {
    return undefined;
  }
  if (target.name === workspace.name) {
    return `${workspace.name} imports itself by name. Use a relative path.`;
  }
  if (!WORKSPACE_DEPS[workspace.name].includes(target.name)) {
    return `${workspace.name} may not depend on ${target.name}.`;
  }
  return exportsOf(target.name).includes(target.subpath)
    ? undefined
    : `"${target.subpath}" is not in ${target.name}'s exports.`;
};

/** Workspaces import only declared packages, through their `exports`. Template projects are checked separately. */
const checkWorkspaces = (
  context: CheckContext,
  workspaceDirs: Map<string, string>,
  templateDirs: string[]
): string[] => {
  const exportsOf = (name: string): string[] => {
    const dir = workspaceDirs.get(name);
    return dir
      ? Object.keys(readPackageJson(dir).exports ?? { ".": null })
      : [];
  };
  const violations: string[] = [];
  for (const [name, dir] of workspaceDirs) {
    if (!isWorkspace(name)) {
      continue;
    }
    const files = listSourceFiles(dir).filter(
      (file) => !templateDirs.some((templateDir) => isInside(templateDir, file))
    );
    for (const file of files) {
      for (const { specifier } of scanImports(file)) {
        const violation = workspaceEdgeViolation(
          { dir, name },
          file,
          specifier,
          exportsOf
        );
        if (violation && !context.isExcepted(file, specifier)) {
          violations.push(
            `${context.toRepoPath(file)} → ${specifier}: ${violation}`
          );
        }
      }
    }
  }
  return violations;
};

/** Templates reach only the authoring surface and files in their own project. */
const checkTemplates = (
  context: CheckContext,
  templateDirs: string[]
): string[] => {
  const violations: string[] = [];
  for (const projectDir of templateDirs) {
    const templatesDir = path.join(projectDir, "templates");
    if (!existsSync(templatesDir)) {
      violations.push(
        `${context.toRepoPath(templatesDir)}: listed in TEMPLATE_PROJECTS but missing.`
      );
      continue;
    }
    for (const file of listSourceFiles(templatesDir)) {
      for (const { specifier } of scanImports(file)) {
        const allowed = specifier.startsWith(".")
          ? isInside(projectDir, path.resolve(path.dirname(file), specifier))
          : TEMPLATE_ALLOWED_IMPORTS.includes(specifier);
        if (!(allowed || context.isExcepted(file, specifier))) {
          violations.push(
            `${context.toRepoPath(file)} → ${specifier}: templates may import only ${TEMPLATE_ALLOWED_IMPORTS.join(", ")} and files in their own project.`
          );
        }
      }
    }
  }
  return violations;
};

/**
 * Walks every source file in the repo and returns each import that the
 * tables in `rules.ts` don't allow. An empty report means every boundary
 * holds.
 */
export const checkBoundaries = (repoRoot: string): BoundaryReport => {
  const toRepoPath = (file: string) => path.relative(repoRoot, file);
  const usedExceptions = new Set<BoundaryException>();
  const context: CheckContext = {
    isExcepted: (file, specifier) => {
      const match = BOUNDARY_EXCEPTIONS.find(
        (exception) =>
          exception.file === toRepoPath(file) &&
          exception.specifier === specifier
      );
      if (match) {
        usedExceptions.add(match);
      }
      return match !== undefined;
    },
    repoRoot,
    toRepoPath,
  };
  const workspaceDirs = discoverWorkspaces(repoRoot);
  const templateDirs = TEMPLATE_PROJECTS.map((project) =>
    path.join(repoRoot, project)
  );

  // Run every rule set before reading `usedExceptions`: they record which exceptions matched.
  const coreLayers = checkCoreLayers(context);
  const workspaces = checkWorkspaces(context, workspaceDirs, templateDirs);
  const templates = checkTemplates(context, templateDirs);
  const unusedExceptions = BOUNDARY_EXCEPTIONS.filter(
    (exception) => !usedExceptions.has(exception)
  ).map(
    (exception) =>
      `${exception.file} → ${exception.specifier}: no longer imported. Remove it from BOUNDARY_EXCEPTIONS.`
  );

  return {
    coreLayers,
    templates,
    undeclaredWorkspaces: checkWorkspaceDeclarations(workspaceDirs),
    unusedExceptions,
    workspaces,
  };
};
