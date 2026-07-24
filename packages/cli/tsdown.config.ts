import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  deps: {
    neverBundle: [
      "@stdout-design/core",
      "@stdout-design/dev-server",
      "@takumi-rs/core",
      "@takumi-rs/helpers",
      "bun:sqlite",
      "better-sqlite3",
      "takumi-js",
    ],
  },
  dts: true,
  entry: ["./src/index.ts", "./src/schema.ts"],
  format: "esm",
  minify: {
    compress: true,
    mangle: false,
  },
});
