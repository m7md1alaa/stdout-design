import { defineConfig } from "tsdown";

export default defineConfig({
  clean: false,
  deps: {
    neverBundle: ["bun:sqlite", "better-sqlite3"],
  },
  dts: true,
  entry: ["./src/index.ts", "./src/schema.ts", "./src/og/index.ts"],
  format: "esm",
  minify: {
    compress: true,
    mangle: false,
  },
});
