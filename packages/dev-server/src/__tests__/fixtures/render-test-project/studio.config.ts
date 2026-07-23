import type { StudioConfig } from "@stdout-design/core";

const config: StudioConfig = {
  locales: ["ar"],
  presets: [{ height: 100, id: "test", platform: "test", width: 100 }],
  templates: {
    "test-card": { componentPath: "./templates/test-card" },
  },
};
export default config;
