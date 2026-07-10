export default {
  defaultPreset: "small",
  locales: ["en", "ar"],
  outDir: "./out",
  presets: [
    { height: 100, id: "small", platform: "test", width: 100 },
    { height: 200, id: "medium", platform: "test", width: 200 },
  ],
  templates: {
    "test-card": {
      componentPath: "./templates/test-card",
      description: "Test card",
    },
  },
};
