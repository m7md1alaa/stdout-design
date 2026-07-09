import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  server: {
    port: 5173,
    proxy: {
      "/cache": "http://localhost:3000",
      "/config": "http://localhost:3000",
      "/events": {
        target: "http://localhost:3000",
        ws: false,
      },
      "/locales": "http://localhost:3000",
      "/measure": "http://localhost:3000",
      "/presets": "http://localhost:3000",
      "/render": "http://localhost:3000",
      "/templates": "http://localhost:3000",
    },
  },
});
