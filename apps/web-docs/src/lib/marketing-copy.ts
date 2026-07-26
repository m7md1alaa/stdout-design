export const hero = {
  eyebrow: "TSX → pixels, from your repo",
  headline: "Your components already are your marketing assets.",
  subhead:
    "stdout-design renders the TSX you already wrote into App Store screenshots, launch cards, and Open Graph images — one CLI command, no Figma, no drift.",
  primaryCta: { href: "/docs", label: "Read the docs" },
  secondaryCta: {
    href: "https://github.com/m7md1alaa/stdout-design",
    label: "View on GitHub",
  },
  installCommand: "npx @stdout-design/cli init",
};

export const gap = {
  eyebrow: "The gap",
  headline:
    "The design system stops being the source of truth the moment you need to post something.",
  oldWay: {
    label: "Today",
    lines: [
      "$ open figma.com",
      "→ rebuild the card by hand",
      "→ ship changes to the product",
      "→ forget to update the export",
      "→ post a screenshot that's already wrong",
    ],
  },
  newWay: {
    label: "With stdout-design",
    lines: [
      "$ studio render bento-feature \\",
      "    --data posts.csv \\",
      "    --out-dir ./out/",
      "→ 10 assets, from the templates you ship",
    ],
  },
};

export const steps = {
  eyebrow: "How it works",
  headline: "Three commands, not a second design tool.",
  items: [
    {
      index: "01",
      title: "Write the template once",
      body: "A plain React component with typed props. No custom DSL an agent can pattern-match it from your existing components.",
    },
    {
      index: "02",
      title: "Render, single or batch",
      body: "One asset from the CLI, or a whole matrix of presets and locales from a data file. Same render path either way.",
    },
    {
      index: "03",
      title: "Point an agent at it",
      body: "The same render core is exposed over MCP, so Claude Code, Cursor, or any agent can generate assets on command.",
    },
  ],
};

export const parity = {
  eyebrow: "One core, three interfaces",
  headline:
    "The live studio, the CLI, and your agent all call the same render path.",
  rows: [
    {
      capability: "Prop editing",
      ui: "Sliders & pickers",
      cli: "--prop flags",
    },
    {
      capability: "Batch processing",
      ui: "Data-row toggle",
      cli: "--data file.csv",
    },
    {
      capability: "Multi-target",
      ui: "Side-by-side preview",
      cli: "--preset all",
    },
    {
      capability: "Validation",
      ui: "Inline error state",
      cli: "Exit code 1",
    },
  ],
};

export const footer = {
  headline: "Render your first asset tonight.",
  body: "Open source, local-first, no account required.",
  installCommand: "npx @stdout-design/cli init",
  links: [
    { href: "/docs", label: "Documentation" },
    { href: "/docs/agents", label: "For agents" },
    { href: "https://github.com", label: "GitHub" },
  ],
};
