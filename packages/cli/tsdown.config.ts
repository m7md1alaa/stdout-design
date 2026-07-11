import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  deps: {
    neverBundle: [
      "@takumi-rs/core",
      "@takumi-rs/helpers",
      "bun:sqlite",
      "takumi-js",
    ],
  },
  dts: false,
  entry: ["./src/index.ts", "./src/schema.ts"],
  format: "esm",
});
