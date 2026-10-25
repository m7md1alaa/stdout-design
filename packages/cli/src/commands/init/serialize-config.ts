import type { StudioConfig } from "@stdout-design/core";

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/u;
const INLINE_MAX = 80;

/**
 * Prints a value as a TypeScript literal: bare keys where possible, and
 * short objects and arrays on one line, the way a person would write the
 * config by hand. Object entries whose value is `undefined` are dropped.
 */
export const toLiteral = (value: unknown, depth = 0): string => {
  if (typeof value !== "object" || value === null) {
    return JSON.stringify(value);
  }
  const entries = Array.isArray(value)
    ? value.map((item) => toLiteral(item, depth + 1))
    : Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(
          ([key, item]) =>
            `${IDENTIFIER.test(key) ? key : JSON.stringify(key)}: ${toLiteral(item, depth + 1)}`
        );
  const [open, close] = Array.isArray(value) ? ["[", "]"] : ["{", "}"];
  if (entries.length === 0) {
    return `${open}${close}`;
  }
  const inline = Array.isArray(value)
    ? `[${entries.join(", ")}]`
    : `{ ${entries.join(", ")} }`;
  if (inline.length <= INLINE_MAX && !inline.includes("\n")) {
    return inline;
  }
  const pad = "  ".repeat(depth + 1);
  const lines = entries.map((entry) => `${pad}${entry},`).join("\n");
  return `${open}\n${lines}\n${"  ".repeat(depth)}${close}`;
};

/** The source of a `studio.config.ts`; `init` and `update` both write it. */
export const serializeConfig = (config: StudioConfig): string =>
  `import type { StudioConfig } from "@stdout-design/cli";

const config: StudioConfig = ${toLiteral(config)};

export default config;
`;
