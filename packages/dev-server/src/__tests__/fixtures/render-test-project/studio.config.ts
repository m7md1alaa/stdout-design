import type { StudioConfig } from "@stdout-design/core";
const config: StudioConfig = {
  locales: ["ar"],
  presets: [{ id: "test", width: 100, height: 100, platform: "test" }],
  templates: {
    "test-card": { componentPath: "./templates/test-card" },
  },
};
export default config;