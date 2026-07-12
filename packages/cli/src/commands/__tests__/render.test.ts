import { describe, expect, test } from "bun:test";

import { ErrorCode, AppError } from "@stdout-design/core";

import { resolveBatchOptions, resolveTemplate } from "../resolver.js";

describe("resolveBatchOptions", () => {
  test("uses config defaults when no CLI options given", () => {
    const config = {
      outDir: "./out",
      presets: [
        {
          height: 1080,
          id: "instagram-square",
          platform: "instagram",
          width: 1080,
        },
        { height: 1200, id: "x-card", platform: "x", width: 1200 },
      ],
    };

    const result = resolveBatchOptions(config);

    expect(result.presets).toEqual(["instagram-square", "x-card"]);
    expect(result.locales).toBeUndefined();
    expect(result.outDir).toBe("./out");
    expect(result.concurrency).toBe(4);
    expect(result.dataFile).toBeUndefined();
    expect(result.failFast).toBeUndefined();
  });

  test("--preset overrides config presets", () => {
    const config = {
      presets: [
        { height: 100, id: "default-preset", platform: "web", width: 100 },
      ],
    };

    const result = resolveBatchOptions(config, {
      preset: "instagram-square,x-card",
    });

    expect(result.presets).toEqual(["instagram-square", "x-card"]);
  });

  test("--locale splits by comma", () => {
    const config = {
      presets: [{ height: 100, id: "default", platform: "web", width: 100 }],
    };

    const result = resolveBatchOptions(config, { locale: "en,ar" });

    expect(result.locales).toEqual(["en", "ar"]);
  });

  test("--out-dir overrides config outDir", () => {
    const config = {
      outDir: "./out",
      presets: [{ height: 100, id: "default", platform: "web", width: 100 }],
    };

    const result = resolveBatchOptions(config, { outDir: "./custom-out" });

    expect(result.outDir).toBe("./custom-out");
  });

  test("--concurrency parses as number", () => {
    const config = {
      presets: [{ height: 100, id: "default", platform: "web", width: 100 }],
    };

    const result = resolveBatchOptions(config, { concurrency: "8" });

    expect(result.concurrency).toBe(8);
  });

  test("--data passes through", () => {
    const config = {
      presets: [{ height: 100, id: "default", platform: "web", width: 100 }],
    };

    const result = resolveBatchOptions(config, { data: "./data.csv" });

    expect(result.dataFile).toBe("./data.csv");
  });

  test("defaults outDir to 'out' when config has none", () => {
    const config = {
      presets: [{ height: 100, id: "default", platform: "web", width: 100 }],
    };

    const result = resolveBatchOptions(config);

    expect(result.outDir).toBe("out");
  });
});

describe("resolveTemplate", () => {
  test("returns componentPath for known template", () => {
    const config = {
      templates: {
        "bento-feature": {
          componentPath: "./templates/bento-feature",
          description: "Apple-style bento feature card.",
        },
      },
    };

    const result = resolveTemplate(config, "bento-feature");

    expect(result).toEqual({
      componentPath: "./templates/bento-feature",
      templateId: "bento-feature",
    });
  });

  test("throws AppError for unknown template", () => {
    const config = {
      templates: {
        "bento-feature": { componentPath: "./templates/bento-feature" },
      },
    };

    expect(() => resolveTemplate(config, "nonexistent")).toThrow(AppError);
  });

  test("throws AppError with suggestion for close template name", () => {
    const config = {
      templates: {
        "bento-feature": { componentPath: "./templates/bento-feature" },
      },
    };

    expect.hasAssertions();
    try {
      resolveTemplate(config, "bento-featur");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe(ErrorCode.TEMPLATE_NOT_FOUND);
      expect((error as AppError).message).toContain("Did you mean");
      expect((error as AppError).message).toContain("bento-feature");
    }
  });
});
