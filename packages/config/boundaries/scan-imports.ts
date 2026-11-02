import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { parseSync } from "oxc-parser";

export interface ImportEdge {
  specifier: string;
  /** True when the import is erased at build time: `import type`, or every binding marked `type`. */
  typeOnly: boolean;
}

const SOURCE_FILE = /\.(?:ts|tsx|mts|cts)$/u;
const STRING_LITERAL = /^(?<quote>["'`])(?<value>[^"'`$]+)\k<quote>$/u;
const SKIPPED_DIRS = new Set(["node_modules", "dist", "out", "coverage"]);

/**
 * Every module specifier a file imports or re-exports, read with a real
 * parser so specifiers inside strings (generated config, docs snippets)
 * don't count. Dynamic `import()` is included when its argument is a plain
 * string; a computed path can't be checked statically and is skipped.
 */
export const scanImports = (filePath: string): ImportEdge[] => {
  const code = readFileSync(filePath, "utf-8");
  const { module, errors } = parseSync(filePath, code);
  const [firstError] = errors;
  if (firstError) {
    throw new Error(`Cannot parse ${filePath}: ${firstError.message}`);
  }

  const edges: ImportEdge[] = [];
  for (const statement of module.staticImports) {
    edges.push({
      specifier: statement.moduleRequest.value,
      typeOnly:
        statement.entries.length > 0 &&
        statement.entries.every((entry) => entry.isType),
    });
  }
  for (const statement of module.staticExports) {
    for (const entry of statement.entries) {
      if (entry.moduleRequest) {
        edges.push({
          specifier: entry.moduleRequest.value,
          typeOnly: entry.isType,
        });
      }
    }
  }
  for (const dynamicImport of module.dynamicImports) {
    const argument = code.slice(
      dynamicImport.moduleRequest.start,
      dynamicImport.moduleRequest.end
    );
    const literal = STRING_LITERAL.exec(argument.trim());
    const value = literal?.groups?.value;
    if (value) {
      edges.push({ specifier: value, typeOnly: false });
    }
  }
  return edges;
};

/** TypeScript source files under `dir`, skipping dependencies, build output, and dot-directories. */
export const listSourceFiles = (dir: string): string[] => {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!(SKIPPED_DIRS.has(entry.name) || entry.name.startsWith("."))) {
        files.push(...listSourceFiles(fullPath));
      }
    } else if (SOURCE_FILE.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      files.push(fullPath);
    }
  }
  return files;
};
