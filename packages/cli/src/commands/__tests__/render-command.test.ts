import { describe, expect, it } from "bun:test";

import { resolveBatchOptions, resolveTemplate } from "../resolver.js";

describe("resolveBatchOptions", () => {
  it("returns all preset IDs from config when no preset override is given", () => {
    const config = {
      outDir: "./out",
      presets: [
        { height: 100, id: "small", platform: "test", width: 100 },
        { height: 200, id: "medium", platform: "test", width: 200 },
      ],
    };

    const result = resolveBatchOptions(config, {});

    expect(result.presets).toEqual(["small", "medium"]);
    expect(result.outDir).toBe("./out");
    expect(result.concurrency).toBe(4);
    expect(result.dataFile).toBeUndefined();
    expect(result.failFast).toBeUndefined();
  });

  it("overrides presets from --preset flag", () => {
    const config = {
      outDir: "./out",
      presets: [
        { height: 100, id: "small", platform: "test", width: 100 },
        { height: 200, id: "medium", platform: "test", width: 200 },
      ],
    };

    const result = resolveBatchOptions(config, { preset: "medium" });

    expect(result.presets).toEqual(["medium"]);
  });

  it("splits comma-separated presets", () => {
    const config = {
      presets: [
        { height: 100, id: "small", platform: "test", width: 100 },
        { height: 300, id: "large", platform: "test", width: 300 },
      ],
    };

    const result = resolveBatchOptions(config, { preset: "small,large" });

    expect(result.presets).toEqual(["small", "large"]);
  });

  it("splits comma-separated locales", () => {
    const config = {
      presets: [{ height: 100, id: "small", platform: "test", width: 100 }],
    };

    const result = resolveBatchOptions(config, { locale: "en,ar,es" });

    expect(result.locales).toEqual(["en", "ar", "es"]);
  });

  it("returns undefined locales when locale option is not provided", () => {
    const config = {
      presets: [{ height: 100, id: "small", platform: "test", width: 100 }],
    };

    const result = resolveBatchOptions(config, {});

    expect(result.locales).toBeUndefined();
  });

  it("overrides outDir from --out-dir flag", () => {
    const config = {
      outDir: "./out",
      presets: [{ height: 100, id: "small", platform: "test", width: 100 }],
    };

    const result = resolveBatchOptions(config, { outDir: "/tmp/output" });

    expect(result.outDir).toBe("/tmp/output");
  });

  it("defaults outDir to 'out' when neither config nor options provides it", () => {
    const config = {
      presets: [{ height: 100, id: "small", platform: "test", width: 100 }],
    };

    const result = resolveBatchOptions(config, {});

    expect(result.outDir).toBe("out");
  });

  it("parses concurrency as a number from string", () => {
    const config = {
      presets: [{ height: 100, id: "small", platform: "test", width: 100 }],
    };

    const result = resolveBatchOptions(config, { concurrency: "8" });

    expect(result.concurrency).toBe(8);
  });
});

describe("resolveTemplate", () => {
  it("returns componentPath and templateId for a known template", () => {
    const config = {
      templates: {
        "test-card": {
          componentPath: "./templates/test-card",
          description: "Test card",
        },
      },
    };

    const result = resolveTemplate(config, "test-card");

    expect(result.componentPath).toBe("./templates/test-card");
    expect(result.templateId).toBe("test-card");
  });

  it("throws with template not found message for an unknown template", () => {
    const config = {
      templates: {
        "test-card": {
          componentPath: "./templates/test-card",
        },
      },
    };

    expect(() => resolveTemplate(config, "nonexistent")).toThrow(
      'Template "nonexistent" not found in studio.config.ts.'
    );
  });

  it("suggests a close name for a typo", () => {
    const config = {
      templates: {
        "bento-feature": {
          componentPath: "./templates/bento-feature",
        },
      },
    };

    expect(() => resolveTemplate(config, "bnto-feature")).toThrow(
      'Did you mean "bento-feature"'
    );
  });

  it("does not suggest when no candidates are close enough", () => {
    const config = {
      templates: {
        "bento-feature": {
          componentPath: "./templates/bento-feature",
        },
      },
    };

    expect(() => resolveTemplate(config, "xyz")).toThrow(
      'Template "xyz" not found in studio.config.ts.'
    );
  });
});
