#!/usr/bin/env bun
import { createRequire } from "node:module";

import { Command } from "commander";

import { run } from "./lib/runner.js";

export type { StudioConfig } from "@stdout-design/core";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version: string };

const program = new Command().allowExcessArguments(true);

program
  .name("studio")
  .description("Social media design tool — render, preview, batch")
  .version(pkg.version, "-v, --version");

// ── dev
program
  .command("dev")
  .description("Start the studio dev server with live preview")
  .argument("[rootDir]", "Project root directory (default: cwd)")
  .option("-p, --port <number>", "Port to run on", "3030")
  .option("--open", "Open browser on start")
  .action(run("dev"));

// ── render
program
  .command("render")
  .description("Render a template — single or batch with --data")
  .argument("<template>", "Template ID from studio.config.ts")
  .argument(
    "[props...]",
    'Template props as key=value or --key value (e.g. headline="Hello")'
  )
  .option("--data <path>", "CSV or JSON data file for batch rendering")
  .option(
    "--preset <ids>",
    'Comma-separated preset IDs, or "all" (default: config defaultPreset)'
  )
  .option("--locale <locales>", "Comma-separated locale codes")
  .option("--out-dir <path>", "Output directory")
  .option("--concurrency <n>", "Max concurrent renders in batch mode", "4")
  .option("--fail-fast", "Stop batch on first error")
  .option("--json", "Output results as JSON")
  // Unknown --flags are template props (`--headline Hello`), parsed later
  // against the template's schema.
  .allowUnknownOption()
  .addHelpText(
    "after",
    `
Examples:
  $ studio render bento-feature
  $ studio render bento-feature headline="Hello" --preset all
  $ studio render bento-feature --headline Hello --locale en,ar
  $ studio render bento-feature --data posts.csv

Set STUDIO_DEBUG=1 for verbose logs.`
  )
  .action(run("render"));

// ── cache
const cacheCmd = program
  .command("cache")
  .description("Manage the render cache");

cacheCmd
  .command("stats")
  .description("Show cache statistics")
  .option("--json", "Output as JSON")
  .argument("[rootDir]", "Project root directory (default: cwd)")
  .action(run("cache", "cacheStats"));

cacheCmd
  .command("clean")
  .description("Clear the render cache")
  .option("--json", "Output as JSON")
  .argument("[rootDir]", "Project root directory (default: cwd)")
  .action(run("cache", "cacheClean"));

// ── lint (not implemented yet — hidden from help)
program
  .command("lint", { hidden: true })
  .description("Check templates for compatibility (coming soon)")
  .argument("[rootDir]", "Project root directory (default: cwd)")
  .action(run("lint"));

// ── init
program
  .command("init")
  .description("Scaffold a new studio project")
  .argument("[projectDir]", "Project directory (default: cwd)")
  .option("-y, --yes", "Skip prompts, use defaults")
  .option("--install-skill", "Install the studio agent skill after setup")
  .action(run("init"));

// ── update
program
  .command("update")
  .description("Update an existing studio project to the latest CLI version")
  .argument("[projectDir]", "Project directory (default: cwd)")
  .option("-y, --yes", "Skip confirmation prompts")
  .action(run("update"));

const skillCmd = program
  .command("skill")
  .description("Manage the studio agent skill for AI coding agents");

skillCmd
  .command("install")
  .description("Install the studio agent skill")
  .option("-y, --yes", "Skip confirmation prompts")
  .action(run("skill", "skillInstall"));

program.parse();
