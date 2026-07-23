import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  deps: {
    neverBundle: ["bun:sqlite"],
  },
  dts: true,
  entry: ["./src/index.ts", "./src/schema.ts"],
  format: "esm",
  minify: {
    compress: true,
    mangle: false,
  },
});
