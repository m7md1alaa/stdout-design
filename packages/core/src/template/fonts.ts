import type { FontConfig } from "../shared/types.js";

export interface FontFace {
  family: string;
  /** Weights to load from Google Fonts. @default [400] */
  weights?: readonly number[];
}

/**
 * One typographic role in a template (display, body, mono): an ordered
 * list of faces. Put the Latin face first and the Arabic or Hebrew face
 * after it; a glyph the first face lacks falls through to the next.
 */
export interface FontRole {
  faces: readonly (string | FontFace)[];
  /** Generic family appended last. @default "sans-serif" */
  generic?: "sans-serif" | "serif" | "monospace";
}

export type FontRoles<R extends string = string> = Readonly<
  Record<R, FontRole>
>;

const DEFAULT_WEIGHTS: readonly number[] = [400];

const toFace = (face: string | FontFace): FontFace =>
  typeof face === "string" ? { family: face } : face;

/** The CSS `font-family` value for a role: its faces in order, then the generic. */
export const fontStack = (role: FontRole): string =>
  [
    ...role.faces.map((face) => toFace(face).family),
    role.generic ?? "sans-serif",
  ].join(", ");

/**
 * Every face a template declares, as Google font configs: one entry per
 * family, with the weights of every role that names it.
 */
export const declaredFontConfigs = (roles: FontRoles): FontConfig[] => {
  const weightsByFamily = new Map<string, Set<number>>();
  for (const role of Object.values(roles)) {
    for (const face of role.faces.map(toFace)) {
      const weights = weightsByFamily.get(face.family) ?? new Set<number>();
      for (const weight of face.weights ?? DEFAULT_WEIGHTS) {
        weights.add(weight);
      }
      weightsByFamily.set(face.family, weights);
    }
  }
  return [...weightsByFamily].map(([family, weights]) => ({
    family,
    source: "google" as const,
    weights: [...weights].toSorted((a, b) => a - b),
  }));
};
