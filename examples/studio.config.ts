import type { StudioConfig } from "@stdout-design/core";

const config: StudioConfig = {
  defaultPreset: "instagram-square",
  fonts: {
    ar: [
      {
        family: "Doran",
        path: "./Doran-Bold.ttf",
        source: "local",
        weights: [700],
      },
    ],
    en: [
      {
        family: "Doran",
        path: "./Doran-Bold.ttf",
        source: "local",
        weights: [700],
      },
    ],
  },
  locales: ["en", "ar"],
  outDir: "./out",
  presets: [
    {
      height: 1080,
      id: "instagram-square",
      platform: "instagram",
      width: 1080,
    },
    { height: 1920, id: "instagram-story", platform: "instagram", width: 1080 },
    { height: 675, id: "x-card", platform: "x", width: 1200 },
    { height: 627, id: "linkedin", platform: "linkedin", width: 1200 },
    { height: 630, id: "og-image", platform: "web", width: 1200 },
  ],
  templates: {
    "bento-feature": {
      componentPath: "./templates/bento-feature",
      description:
        "Apple-style bento feature card with image, headline, and tag badges.",
    },
    "bento-features": {
      componentPath: "./templates/bento-features",
      description:
        "A quote card with attribution, avatar, and customizable background.",
    },
    "docs-og": {
      componentPath: "./templates/docs-og",
      description:
        "web-docs' OG card for doc pages — title/description/siteName, posterized glow.",
    },
    "features-showcase": {
      componentPath: "./templates/features-showcase",
      description:
        "Full-bleed feature showcase card with step indicator, image overlay, and theme variants.",
    },
    "stat-card": {
      componentPath: "./templates/stat-card",
      description:
        "A milestone or stat card for social media — big number, headline, accent color.",
    },
  },
};

export default config;
