import {
  compileTemplate,
  validateProps,
  renderToPixels,
} from "@stdout-design/core";

import StatCard, { propsSchema } from "./templates/stat-card.js";

const props = validateProps(propsSchema, {
  accentColor: "#96e8cd",
  label: "up 23% from last month",
  stat: "10,482",
  title: "Active Users",
});

const element = <StatCard {...props} />;

const template = await compileTemplate(element);

const { bytes } = await renderToPixels(template, {
  height: 1080,
  width: 1080,
});

await Bun.write("./out/stat-card.png", bytes);

console.log("Rendered stat-card.png");
