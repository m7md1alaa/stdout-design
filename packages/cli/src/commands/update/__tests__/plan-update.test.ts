import { describe, expect, test } from "bun:test";

import type { StudioConfig } from "@stdout-design/core";

import type { Defaults } from "../../init/merge-config.js";
import { planUpdate } from "../../update.js";

const defaults: Defaults = {
  defaultPreset: "instagram-square",
  presets: [
    {
      height: 1080,
      id: "instagram-square",
      platform: "instagram",
      width: 1080,
    },
    { height: 1200, id: "x-card", platform: "x", width: 1200 },
  ],
  templates: {
    "bento-feature": {
      componentPath: "./templates/bento-feature",
      description: "Apple-style bento feature card.",
    },
  },
};

describe("planUpdate", () => {
  test("returns plan with updated scaffoldVersion", () => {
    const existing: StudioConfig = {
      presets: [],
      scaffoldVersion: "0.1.0",
      templates: {},
    };

    const plan = planUpdate(existing, defaults, "0.2.0", new Set());

    expect(plan.mergedConfig.scaffoldVersion).toBe("0.2.0");
    expect(plan.summary.oldVersion).toBe("0.1.0");
    expect(plan.summary.newVersion).toBe("0.2.0");
  });

  test("includes installedVersion in the plan", () => {
    const existing: StudioConfig = {
      presets: [],
      scaffoldVersion: "0.1.0",
      templates: {},
    };

    const plan = planUpdate(existing, defaults, "0.2.0", new Set());

    expect(plan.installedVersion).toBe("0.2.0");
  });

  test("summary reflects added presets when existing has none", () => {
    const existing: StudioConfig = {
      presets: [],
      templates: {},
    };

    const plan = planUpdate(existing, defaults, "0.2.0", new Set());

    expect(plan.summary.addedPresets).toEqual(["instagram-square", "x-card"]);
    expect(plan.mergedConfig.presets).toHaveLength(2);
  });

  test("no added presets when existing already has all defaults", () => {
    const existing: StudioConfig = {
      presets: [
        {
          height: 1080,
          id: "instagram-square",
          platform: "instagram",
          width: 1080,
        },
        { height: 1200, id: "x-card", platform: "x", width: 1200 },
      ],
      templates: {},
    };

    const plan = planUpdate(existing, defaults, "0.2.0", new Set());

    expect(plan.summary.addedPresets).toEqual([]);
    expect(plan.mergedConfig.presets).toHaveLength(2);
  });

  test("preserves user's defaultPreset when it still exists in merged presets", () => {
    const existing: StudioConfig = {
      defaultPreset: "instagram-square",
      presets: [
        {
          height: 1080,
          id: "instagram-square",
          platform: "instagram",
          width: 1080,
        },
      ],
      templates: {},
    };

    const plan = planUpdate(existing, defaults, "0.2.0", new Set());

    expect(plan.mergedConfig.defaultPreset).toBe("instagram-square");
  });

  test("falls back to CLI default when user defaultPreset no longer in merged presets", () => {
    const existing: StudioConfig = {
      defaultPreset: "old-square",
      presets: [],
      templates: {},
    };

    const plan = planUpdate(existing, defaults, "0.2.0", new Set());

    expect(plan.mergedConfig.defaultPreset).toBe("instagram-square");
  });

  test("marks deprecated presets in the plan", () => {
    const existing: StudioConfig = {
      presets: [],
      templates: {},
    };

    const deprecated = new Set(["instagram-square"]);
    const plan = planUpdate(existing, defaults, "0.2.0", deprecated);

    expect(plan.summary.deprecatedPresets).toEqual(["instagram-square"]);
    const instagram = plan.mergedConfig.presets.find(
      (p) => p.id === "instagram-square"
    );
    expect(instagram?.deprecated).toBe(true);
  });
});
