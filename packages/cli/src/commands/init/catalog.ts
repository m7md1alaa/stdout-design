import type { Script, StudioConfig } from "@stdout-design/core";

type FontConfig = NonNullable<StudioConfig["fonts"]>[string][number];

/**
 * Every Google Font a starter uses. The array order is the load order, and
 * the first loaded face is the fallback for text with no `fontFamily`. The
 * script decides which locales a face is registered for.
 */
const FONTS = [
  { family: "Archivo Black", script: "latin", weights: [400] },
  { family: "Anton", script: "latin", weights: [400] },
  { family: "Bricolage Grotesque", script: "latin", weights: [400, 700] },
  { family: "Instrument Serif", script: "latin", weights: [400] },
  { family: "Space Mono", script: "latin", weights: [400, 700] },
  { family: "Lalezar", script: "arabic", weights: [400] },
  { family: "IBM Plex Sans Arabic", script: "arabic", weights: [400, 700] },
  { family: "Amiri", script: "arabic", weights: [400, 700] },
] as const satisfies readonly {
  family: string;
  script: Script;
  weights: readonly number[];
}[];

type FontFamily = (typeof FONTS)[number]["family"];

interface Starter {
  id: string;
  /** The CLI version that first shipped this starter; `update` adds it to older projects. */
  since: string;
  label: string;
  hint: string;
  description: string;
  /** The families the template names in its `fontFamily` stacks. */
  fonts: readonly FontFamily[];
}

/** The starter templates `studio init` offers, in prompt order. */
export const STARTERS = [
  {
    description:
      "Loud streetwear landing page with stickers and a stats strip.",
    fonts: ["Archivo Black", "Space Mono", "Lalezar", "IBM Plex Sans Arabic"],
    hint: "Landing page hero",
    id: "launch-hero",
    label: "Launch Hero",
    since: "0.6.0",
  },
  {
    description:
      "Budgeting-app bento grid: metric, receipt, chart, and gauge tiles.",
    fonts: ["Bricolage Grotesque", "Space Mono", "IBM Plex Sans Arabic"],
    hint: "Product bento grid",
    id: "bento-feature",
    label: "Bento Feature",
    since: "0.1.0",
  },
  {
    description:
      "Retro print poster with a cassette, tape stripes, and a stamp.",
    fonts: [
      "Anton",
      "Archivo Black",
      "Instrument Serif",
      "Space Mono",
      "Lalezar",
      "IBM Plex Sans Arabic",
      "Amiri",
    ],
    hint: "Retro print poster",
    id: "retro-poster",
    label: "Retro Poster",
    since: "0.6.0",
  },
  {
    description: "Editorial six-item grid with drawn specimens in each cell.",
    fonts: [
      "Anton",
      "Archivo Black",
      "Instrument Serif",
      "Space Mono",
      "Lalezar",
      "IBM Plex Sans Arabic",
      "Amiri",
    ],
    hint: "Editorial listicle",
    id: "trend-poster",
    label: "Trend Poster",
    since: "0.6.0",
  },
] as const satisfies readonly Starter[];

export type StarterId = (typeof STARTERS)[number]["id"];

export const STARTER_IDS: StarterId[] = STARTERS.map((s) => s.id);

export const isStarterId = (id: string): id is StarterId =>
  (STARTER_IDS as string[]).includes(id);

export const starter = (id: StarterId): Starter => {
  const found: Starter | undefined = STARTERS.find((s) => s.id === id);
  if (!found) {
    throw new Error(`Unknown starter "${id}".`);
  }
  return found;
};

/** The fonts the given starters use for one script, in load order. */
export const starterFonts = (
  ids: StarterId[],
  script: Script
): FontConfig[] => {
  const used = new Set<FontFamily>(ids.flatMap((id) => starter(id).fonts));
  return FONTS.filter(
    (font) => used.has(font.family) && font.script === script
  ).map(({ family, weights }) => ({
    family,
    source: "google",
    weights: [...weights],
  }));
};
