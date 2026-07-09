import type { StudioConfig } from "@stdout-design/core";

const config: StudioConfig = {
  defaultPreset: "instagram-square",
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
    "quote-card": {
      componentPath: "./templates/quote-card",
      description:
        "A quote card with attribution, avatar, and customizable background.",
    },
    "stat-card": {
      componentPath: "./templates/stat-card",
      description:
        "A milestone or stat card for social media — big number, headline, accent color.",
    },
  },
};

export default config;
