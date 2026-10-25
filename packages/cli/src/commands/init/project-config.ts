import { scriptOf } from "@stdout-design/core";
import type { FontConfig, StudioConfig } from "@stdout-design/core";

import { STARTER_IDS, getStarter, starterFonts } from "./catalog.js";
import type { StarterId } from "./catalog.js";
import { compareVersions } from "./version.js";

const PRESETS: StudioConfig["presets"] = [
  { height: 1080, id: "instagram-square", platform: "instagram", width: 1080 },
  { height: 675, id: "x-card", platform: "x", width: 1200 },
];

/** What a project was created with; `init` asks, `update` reads it back. */
export interface ProjectChoices {
  starters: StarterId[];
  locales: string[];
}

// Only the fonts the chosen starters use. Arabic locales don't fall back
// to `default`, so their entry lists the Latin faces too.
const fontsFor = ({
  starters,
  locales,
}: ProjectChoices): Record<string, FontConfig[]> | undefined => {
  const latin = starterFonts(starters, "latin");
  const arabic = starterFonts(starters, "arabic");
  const fonts: Record<string, FontConfig[]> = {};
  if (latin.length > 0) {
    fonts.default = latin;
  }
  if (arabic.length > 0) {
    for (const locale of locales.filter((l) => scriptOf(l) === "arabic")) {
      fonts[locale] = [...latin, ...arabic];
    }
  }
  return Object.keys(fonts).length > 0 ? fonts : undefined;
};

/**
 * The config a project should have for the given choices. `init` writes it
 * as is; `update` builds it for the starters that are new to the project
 * and merges it into the existing config.
 */
export const buildProjectConfig = (
  version: string,
  choices: ProjectChoices
  // Keys in the order a reader scans the generated file.
  // oxlint-disable-next-line eslint/sort-keys
): StudioConfig => ({
  scaffoldVersion: version,
  defaultPreset: "instagram-square",
  outDir: "./out",
  locales: choices.locales.length > 0 ? choices.locales : undefined,
  fonts: fontsFor(choices),
  presets: PRESETS,
  templates: Object.fromEntries(
    choices.starters.map((id) => [
      id,
      {
        componentPath: `./templates/${id}`,
        description: getStarter(id).description,
      },
    ])
  ),
});

/**
 * Starters shipped after the project's scaffold version and no later than
 * the running CLI. A starter the user left out at `init` shipped before
 * their scaffold version, so `update` never brings it back.
 */
export const startersSince = (
  scaffoldVersion: string | undefined,
  installedVersion: string
): StarterId[] =>
  STARTER_IDS.filter((id) => {
    const { since } = getStarter(id);
    const isNewToProject = compareVersions(since, scaffoldVersion ?? "0") > 0;
    const isShipped =
      installedVersion === "latest" ||
      compareVersions(since, installedVersion) <= 0;
    return isNewToProject && isShipped;
  });
