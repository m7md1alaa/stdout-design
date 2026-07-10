import { renderComponent } from "@stdout-design/core";

import StatCard, { propsSchema } from "./templates/stat-card.js";

const { outputPath } = await renderComponent({
  component: StatCard,
  preset: { height: 1080, id: "instagram-square", width: 1080 },
  props: {
    accentColor: "#96e8cd",
    label: "up 23% from last month",
    stat: "10,482",
    title: "Active Users",
  },
  propsSchema,
});

console.log(`Rendered: ${outputPath}`);
