import type { StudioConfig } from "@stdout-design/core";

const config: StudioConfig = {
  templates: {
    "stat-card": {
      componentPath: "./templates/stat-card",
      description: "A milestone or stat card for social media — big number, headline, accent color.",
    },
    "bento-feature": {
      componentPath: "./templates/bento-feature",
      description: "Apple-style bento feature card with image, headline, and tag badges.",
    },
    "quote-card": {
      componentPath: "./templates/quote-card",
      description: "A quote card with attribution, avatar, and customizable background.",
    },
  },
  presets: [
    { id: "instagram-square", width: 1080, height: 1080, platform: "instagram" },
    { id: "instagram-story", width: 1080, height: 1920, platform: "instagram" },
    { id: "x-card", width: 1200, height: 675, platform: "x" },
    { id: "linkedin", width: 1200, height: 627, platform: "linkedin" },
    { id: "og-image", width: 1200, height: 630, platform: "web" },
  ],
  defaultPreset: "instagram-square",
  locales: ["en", "ar"],
  outDir: "./out",
};

export default config;
