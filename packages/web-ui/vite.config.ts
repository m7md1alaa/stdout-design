import path from "node:path";

import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/cache": "http://localhost:3030",
      "/config": "http://localhost:3030",
      "/events": {
        target: "http://localhost:3030",
        ws: false,
      },
      "/locales": "http://localhost:3030",
      "/measure": "http://localhost:3030",
      "/presets": "http://localhost:3030",
      "/render": "http://localhost:3030",
      "/templates": "http://localhost:3030",
    },
  },
});
