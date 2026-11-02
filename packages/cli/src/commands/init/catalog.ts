interface Starter {
  id: string;
  /** The CLI version that first shipped this starter; `update` adds it to older projects. */
  since: string;
  label: string;
  hint: string;
  description: string;
}

/** The starter templates `studio init` offers, in prompt order. */
export const STARTERS = [
  {
    description:
      "Loud streetwear landing page with stickers and a stats strip.",
    hint: "Landing page hero",
    id: "launch-hero",
    label: "Launch Hero",
    since: "0.7.0",
  },
  {
    description:
      "Budgeting-app bento grid: metric, receipt, chart, and gauge tiles.",
    hint: "Product bento grid",
    id: "bento-feature",
    label: "Bento Feature",
    since: "0.1.0",
  },
  {
    description:
      "Retro print poster with a cassette, tape stripes, and a stamp.",
    hint: "Retro print poster",
    id: "retro-poster",
    label: "Retro Poster",
    since: "0.7.0",
  },
  {
    description: "Editorial six-item grid with drawn specimens in each cell.",
    hint: "Editorial listicle",
    id: "trend-poster",
    label: "Trend Poster",
    since: "0.7.0",
  },
] as const satisfies readonly Starter[];

export type StarterId = (typeof STARTERS)[number]["id"];

export const STARTER_IDS: StarterId[] = STARTERS.map((s) => s.id);

export const isStarterId = (id: string): id is StarterId =>
  (STARTER_IDS as string[]).includes(id);

export const getStarter = (id: StarterId): Starter => {
  const found: Starter | undefined = STARTERS.find((s) => s.id === id);
  if (!found) {
    throw new Error(`Unknown starter "${id}".`);
  }
  return found;
};
