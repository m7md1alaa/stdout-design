export const hero = {
  eyebrow: "TSX → pixels, from your repo",
  headline: "Your components already are your marketing assets.",
  subhead:
    "stdout-design renders the TSX you already wrote into App Store screenshots, launch cards, and Open Graph images one CLI command, no Figma, no drift.",
  primaryCta: { href: "/docs", label: "Read the docs" },
  secondaryCta: {
    href: "https://github.com/m7md1alaa/stdout-design",
    label: "Star on GitHub",
  },
  audiences: [
    {
      id: "humans",
      label: "For humans",
      command: "npx @stdout-design/cli init",
    },
    {
      id: "agents",
      label: "For agents",
      command: "npx @stdout-design/cli init --install-skill",
    },
  ],
};

export const logos = {
  label: "Renders to",
  items: [
    "App Store",
    "Google Play",
    "Open Graph",
    "X cards",
    "Launch pages",
    "Web",
  ],
};

export const features = {
  eyebrow: "Why stdout-design",
  headline:
    "A render pipeline for the assets you post, not a second design tool.",
  items: [
    {
      label: "One command",
      title: "Render tonight",
      body: "One `studio render` call turns a typed TSX template into production assets. No Figma, no rebuild, no drift between the product and the export.",
    },
    {
      label: "Built for agents",
      title: "Point an agent at it",
      body: "The same render core is exposed over MCP, so Claude Code, Cursor, or any agent can generate assets on command from the templates you already ship.",
    },
    {
      label: "Batch at scale",
      title: "A data file, a whole set",
      body: "Render a full matrix of presets and locales from a CSV or JSON data file  ten assets, or ten thousand. Same render path as a single asset.",
    },
    {
      label: "Multi-target",
      title: "One template, every canvas",
      body: "App Store screenshots, Open Graph images, and launch cards from the same component. Each target gets its own size, preset, and crop.",
    },
    {
      label: "Type-safe templates",
      title: "Props, not a DSL",
      body: "A plain React component with typed props. No custom DSL  agents can pattern-match it from your existing components on day one.",
    },
    {
      label: "Local-first",
      title: "Open source, no account",
      body: "Runs on your machine against your repo. Open source, no account, no locked-in exports. Your future self will thank you.",
    },
  ],
};

export const showcase = {
  eyebrow: "One core, three interfaces",
  headline:
    "The live studio, the CLI, and your agent all call the same render path.",
  body: "The same render task  a bento-feature card from a data file  expressed in each interface.",
  ariaLabel: "Interface example",
  tabs: [
    {
      id: "cli",
      label: "CLI",
      file: "$ studio render",
      code: `$ npx @stdout-design/cli init
✔ Created stdout.config.ts

$ studio render bento-feature \\
    --data ./data/posts.csv \\
    --preset all \\
    --out-dir ./out/
✔ Rendered 10 assets in 1.2s

$ ls ./out/
launch-card.png  og-post-01.png  og-post-02.png  store@3x.png  x-card.png`,
    },
    {
      id: "studio",
      label: "Studio",
      file: "BentoFeature.tsx",
      code: `// Same template, prop editing live in the Studio
import type { Props } from "@stdout-design/core";

export function BentoFeature({ title, rows }: Props) {
  return (
    <section className="grid grid-cols-2 gap-4">
      {rows.map((row) => (
        <Card key={row.id} {...row} />
      ))}
    </section>
  );
}`,
    },
    {
      id: "agent",
      label: "Agent (MCP)",
      file: "mcp request",
      code: `// Any agent, over MCP  the same render path
{
  "method": "tools/call",
  "params": {
    "name": "studio_render",
    "arguments": {
      "template": "bento-feature",
      "data": "./data/posts.csv",
      "preset": "all",
      "outDir": "./out"
    }
  }
}`,
    },
  ],
};

export const footer = {
  headline: "Render your first asset tonight.",
  body: "Open source, local-first, no account required.",
  links: [
    { href: "/docs", label: "Documentation" },
    { href: "/docs/agents", label: "For agents" },
    { href: "https://github.com", label: "GitHub" },
  ],
};
