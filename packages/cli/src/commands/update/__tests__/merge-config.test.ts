import { describe, expect, test } from "bun:test";

import { mergeConfig } from "../../init/merge-config.js";

const defaults = {
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

describe("mergeConfig", () => {
  test("updates scaffoldVersion to current version", () => {
    const existing = {
      presets: [],
      scaffoldVersion: "0.1.0",
      templates: {},
    };

    const result = mergeConfig(existing, defaults, "0.2.0", new Set());

    expect(result.config.scaffoldVersion).toBe("0.2.0");
    expect(result.summary.oldVersion).toBe("0.1.0");
    expect(result.summary.newVersion).toBe("0.2.0");
  });

  test("treats missing scaffoldVersion as null old version", () => {
    const existing = {
      presets: [],
      templates: {},
    };

    const result = mergeConfig(existing, defaults, "0.2.0", new Set());

    expect(result.config.scaffoldVersion).toBe("0.2.0");
    expect(result.summary.oldVersion).toBeNull();
    expect(result.summary.newVersion).toBe("0.2.0");
  });

  test("preserves user's defaultPreset when it still exists in merged presets", () => {
    const existing = {
      defaultPreset: "x-card",
      presets: [],
      templates: {},
    };

    const result = mergeConfig(existing, defaults, "0.2.0", new Set());

    expect(result.config.defaultPreset).toBe("x-card");
  });

  test("falls back to CLI defaultPreset when user's is removed", () => {
    const existing = {
      defaultPreset: "deleted-preset",
      presets: [],
      templates: {},
    };

    const result = mergeConfig(existing, defaults, "0.2.0", new Set());

    expect(result.config.defaultPreset).toBe("instagram-square");
  });

  test("falls back to first default preset when no defaultPreset in defaults", () => {
    const existing = {
      defaultPreset: "deleted-preset",
      presets: [],
      templates: {},
    };
    const noDefaultPreset = { ...defaults, defaultPreset: undefined };

    const result = mergeConfig(existing, noDefaultPreset, "0.2.0", new Set());

    expect(result.config.defaultPreset).toBe("instagram-square");
  });

  test("preserves user's outDir value", () => {
    const existing = {
      outDir: "./my-custom-out",
      presets: [],
      templates: {},
    };

    const result = mergeConfig(existing, defaults, "0.2.0", new Set());

    expect(result.config.outDir).toBe("./my-custom-out");
  });

  test("adds new CLI default presets the user doesn't have", () => {
    const existing = {
      presets: [],
      templates: {},
    };

    const result = mergeConfig(existing, defaults, "0.2.0", new Set());

    expect(result.config.presets).toHaveLength(2);
    expect(
      result.config.presets.find((p) => p.id === "instagram-square")
    ).toBeDefined();
    expect(result.config.presets.find((p) => p.id === "x-card")).toBeDefined();
  });

  test("preserves user's custom presets alongside new defaults", () => {
    const existing = {
      presets: [
        {
          height: 627,
          id: "linkedin-banner",
          platform: "linkedin",
          width: 1200,
        },
      ],
      templates: {},
    };

    const result = mergeConfig(existing, defaults, "0.2.0", new Set());

    expect(result.config.presets).toHaveLength(3);
    expect(
      result.config.presets.find((p) => p.id === "linkedin-banner")
    ).toBeDefined();
    expect(
      result.config.presets.find((p) => p.id === "instagram-square")
    ).toBeDefined();
    expect(result.config.presets.find((p) => p.id === "x-card")).toBeDefined();
  });

  test("does not duplicate presets that user already has by id", () => {
    const existing = {
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

    const result = mergeConfig(existing, defaults, "0.2.0", new Set());

    const instagramPresets = result.config.presets.filter(
      (p) => p.id === "instagram-square"
    );
    expect(instagramPresets).toHaveLength(1);
  });

  test("marks known-deprecated presets with deprecated flag", () => {
    const existing = {
      presets: [],
      templates: {},
    };

    const result = mergeConfig(
      existing,
      defaults,
      "0.2.0",
      new Set(["x-card"])
    );

    const xCard = result.config.presets.find((p) => p.id === "x-card");
    expect(xCard).toBeDefined();
    expect(xCard?.deprecated).toBe(true);
    const instagram = result.config.presets.find(
      (p) => p.id === "instagram-square"
    );
    expect(instagram?.deprecated).toBeUndefined();
  });

  test("marks user's existing deprecated presets with deprecated flag", () => {
    const existing = {
      presets: [{ height: 1200, id: "x-card", platform: "x", width: 1200 }],
      templates: {},
    };

    const result = mergeConfig(
      existing,
      defaults,
      "0.2.0",
      new Set(["x-card"])
    );

    const xCard = result.config.presets.find((p) => p.id === "x-card");
    expect(xCard?.deprecated).toBe(true);
    expect(xCard?.height).toBe(1200);
  });

  test("preserves user's template registrations", () => {
    const existing = {
      presets: [],
      templates: {
        "my-template": {
          componentPath: "./templates/my-template",
          description: "My custom template",
        },
      },
    };

    const result = mergeConfig(existing, defaults, "0.2.0", new Set());

    expect(result.config.templates["my-template"]).toBeDefined();
    expect(result.config.templates["my-template"]?.description).toBe(
      "My custom template"
    );
  });

  test("adds new default templates the user doesn't have", () => {
    const existing = {
      presets: [],
      templates: {},
    };

    const result = mergeConfig(existing, defaults, "0.2.0", new Set());

    expect(result.config.templates["bento-feature"]).toBeDefined();
    expect(result.config.templates["bento-feature"]?.componentPath).toBe(
      "./templates/bento-feature"
    );
  });

  test("user's template wins on key conflict with default", () => {
    const existing = {
      presets: [],
      templates: {
        "bento-feature": {
          componentPath: "./templates/my-bento",
          description: "My bento override",
        },
      },
    };

    const result = mergeConfig(existing, defaults, "0.2.0", new Set());

    expect(result.config.templates["bento-feature"]).toBeDefined();
    expect(result.config.templates["bento-feature"]?.componentPath).toBe(
      "./templates/my-bento"
    );
    expect(result.config.templates["bento-feature"]?.description).toBe(
      "My bento override"
    );
  });

  test("preserves both user templates and adds new defaults", () => {
    const existing = {
      presets: [],
      templates: {
        "custom-hero": {
          componentPath: "./templates/custom-hero",
        },
      },
    };

    const result = mergeConfig(existing, defaults, "0.2.0", new Set());

    expect(result.config.templates["custom-hero"]).toBeDefined();
    expect(result.config.templates["bento-feature"]).toBeDefined();
  });

  test("ChangeSummary reflects all changes when everything differs", () => {
    const existing = {
      presets: [{ height: 1200, id: "x-card", platform: "x", width: 1200 }],
      templates: {},
    };

    const result = mergeConfig(
      existing,
      defaults,
      "0.2.0",
      new Set(["x-card"])
    );

    expect(result.summary.oldVersion).toBeNull();
    expect(result.summary.newVersion).toBe("0.2.0");
    expect(result.summary.addedPresets).toEqual(["instagram-square"]);
    expect(result.summary.deprecatedPresets).toEqual(["x-card"]);
    expect(result.summary.addedTemplates).toEqual(["bento-feature"]);
  });

  test("ChangeSummary is empty when existing matches defaults", () => {
    const result = mergeConfig(defaults, defaults, "0.1.0", new Set());

    expect(result.summary.addedPresets).toEqual([]);
    expect(result.summary.deprecatedPresets).toEqual([]);
    expect(result.summary.addedTemplates).toEqual([]);
  });
});
