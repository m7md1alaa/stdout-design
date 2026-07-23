import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  dts: true,
  entry: ["./src/index.ts", "./src/serve.ts"],
  format: "esm",
  minify: {
    compress: true,
    mangle: false,
  },
});
