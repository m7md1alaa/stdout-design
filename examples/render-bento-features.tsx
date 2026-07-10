import { runBatch } from "@stdout-design/core";

const { manifest } = await runBatch({
  dataFile: "./data/features.json",
  rootDir: import.meta.dir,
  templateId: "features-showcase",
});

console.log(`Rendered ${manifest.completedCount} features-showcase assets`);
