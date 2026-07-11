#!/usr/bin/env bun
import { Command } from "commander";

import { formatError } from "./lib/display.js";

export { defineSchema, type StudioConfig } from "@stdout-design/core";

const program = new Command().allowExcessArguments(true);

program
  .name("studio")
  .description("Social media design tool — render, preview, batch")
  .version("0.0.0");

// ── dev
program
  .command("dev")
  .description("Start the studio dev server with live preview")
  .argument("[rootDir]", "Project root directory (default: cwd)")
  .option("-p, --port <number>", "Port to run on", "3000")
  .option("--open", "Open browser on start")
  .action(async (rootDir, options) => {
    try {
      const { dev } = await import("./commands/dev.js");
      await dev(rootDir, options);
    } catch (error) {
      console.error(formatError(error));
      process.exit(1);
    }
  });

// ── render
program
  .command("render")
  .description("Render a template — single or batch with --data")
  .argument("<template>", "Template ID from studio.config.ts")
  .argument("[props...]", 'Props as key=value pairs (e.g. title="Hello")')
  .option("--data <path>", "CSV or JSON data file for batch rendering")
  .option("--preset <ids>", "Comma-separated preset IDs")
  .option("--locale <locales>", "Comma-separated locale codes")
  .option("--out-dir <path>", "Output directory")
  .option("--concurrency <n>", "Max concurrent renders in batch mode", "4")
  .option("--fail-fast", "Stop batch on first error")
  .option("--json", "Output results as JSON")
  .action(async (template, props, options) => {
    try {
      const { render } = await import("./commands/render.js");
      await render(template, props, options);
    } catch (error) {
      console.error(formatError(error));
      process.exit(1);
    }
  });

// ── cache
const cacheCmd = program
  .command("cache")
  .description("Manage the render cache");

cacheCmd
  .command("stats")
  .description("Show cache statistics")
  .option("--json", "Output as JSON")
  .argument("[rootDir]", "Project root directory (default: cwd)")
  .action(async (rootDir, options) => {
    try {
      const { cacheStats } = await import("./commands/cache.js");
      await cacheStats(rootDir, options);
    } catch (error) {
      console.error(formatError(error));
      process.exit(1);
    }
  });

cacheCmd
  .command("clean")
  .description("Clear the render cache")
  .option("--json", "Output as JSON")
  .argument("[rootDir]", "Project root directory (default: cwd)")
  .action(async (rootDir, options) => {
    try {
      const { cacheClean } = await import("./commands/cache.js");
      await cacheClean(rootDir, options);
    } catch (error) {
      console.error(formatError(error));
      process.exit(1);
    }
  });

// ── lint
program
  .command("lint")
  .description("Check templates for compatibility (coming soon)")
  .argument("[rootDir]", "Project root directory (default: cwd)")
  .action(async (rootDir) => {
    try {
      const { lint } = await import("./commands/lint.js");
      await lint(rootDir);
    } catch (error) {
      console.error(formatError(error));
      process.exit(1);
    }
  });

// ── init
program
  .command("init")
  .description("Scaffold a new studio project")
  .argument("[projectDir]", "Project directory (default: cwd)")
  .option("-y, --yes", "Skip prompts, use defaults")
  .action(async (projectDir, options) => {
    try {
      const { init } = await import("./commands/init.js");
      await init(projectDir, { yes: options.yes ?? false });
    } catch (error) {
      console.error(formatError(error));
      process.exit(1);
    }
  });

program.parse();
