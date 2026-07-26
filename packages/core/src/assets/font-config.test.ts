// oxlint-disable typescript/no-non-null-assertion
import { afterEach, describe, expect, it, mock } from "bun:test";

import type { Font } from "../engine/takumi-types-shim.js";

const mockGoogleFonts = mock<(...args: unknown[]) => Promise<Font[]>>(() =>
  Promise.resolve([])
);
const mockReadFile = mock(() => Promise.resolve(Buffer.from([])));

mock.module("@takumi-rs/helpers", () => ({
  googleFonts: mockGoogleFonts,
}));

mock.module("node:fs/promises", () => ({
  readFile: mockReadFile,
}));

afterEach(() => {
  mockGoogleFonts.mockImplementation(() => Promise.resolve([]));
  mockReadFile.mockImplementation(() => Promise.resolve(Buffer.from([])));
});

const { createFetchFontsFromConfig } = await import("./font-config.js");

describe("createFetchFontsFromConfig", () => {
  describe("factory: fontsConfig parameter", () => {
    it("returns undefined when fontsConfig is undefined", () => {
      const result = createFetchFontsFromConfig();

      expect(result).toBeUndefined();
    });

    it("returns undefined when fontsConfig is null", () => {
      const result = createFetchFontsFromConfig(null as never);

      expect(result).toBeUndefined();
    });

    it("returns a function when fontsConfig is an empty object", () => {
      const fetchFonts = createFetchFontsFromConfig({});

      expect(fetchFonts).toBeFunction();
    });
  });

  describe("fetcher: locale lookup edge cases", () => {
    it("returns null for any locale when config is empty", async () => {
      const fetchFonts = createFetchFontsFromConfig({})!;

      const result = await fetchFonts("ar");

      expect(result).toBeNull();
    });

    it("returns null when locale entry is null", async () => {
      const fetchFonts = createFetchFontsFromConfig({ ar: null as never })!;

      const result = await fetchFonts("ar");

      expect(result).toBeNull();
    });

    it("returns null when locale entry is an empty array", async () => {
      const fetchFonts = createFetchFontsFromConfig({ ar: [] })!;

      const result = await fetchFonts("ar");

      expect(result).toBeNull();
    });

    it("returns null when locale entry is a string (not array)", async () => {
      const fetchFonts = createFetchFontsFromConfig({
        ar: "not-an-array",
      } as never)!;

      const result = await fetchFonts("ar");

      expect(result).toBeNull();
    });

    it("returns null when locale entry is a number", async () => {
      const fetchFonts = createFetchFontsFromConfig({ ar: 42 } as never)!;

      const result = await fetchFonts("ar");

      expect(result).toBeNull();
    });
  });

  describe("fetcher: googleFonts failure modes", () => {
    const validConfig = { ar: [{ family: "Test Font", weights: [400] }] };

    it("returns null when googleFonts throws", async () => {
      mockGoogleFonts.mockImplementation(() => {
        throw new Error("google fonts unavailable");
      });
      const fetchFonts = createFetchFontsFromConfig(validConfig)!;

      const result = await fetchFonts("ar");

      expect(result).toBeNull();
    });

    it("returns null when googleFonts rejects", async () => {
      mockGoogleFonts.mockImplementation(() =>
        Promise.reject(new Error("network failure"))
      );
      const fetchFonts = createFetchFontsFromConfig(validConfig)!;

      const result = await fetchFonts("ar");

      expect(result).toBeNull();
    });

    it("returns null when googleFonts returns null", async () => {
      mockGoogleFonts.mockImplementation(() => Promise.resolve(null as never));
      const fetchFonts = createFetchFontsFromConfig(validConfig)!;

      const result = await fetchFonts("ar");

      expect(result).toBeNull();
    });
  });

  describe("fetcher: googleFonts return value resilience", () => {
    const validConfig = { ar: [{ family: "Test Font", weights: [400] }] };

    it("filters Uint8Array entries from fontFamilies but keeps them in fonts", async () => {
      const uint8Font = new Uint8Array([1, 2, 3]);
      const descriptorFont = {
        data: new Uint8Array([4, 5, 6]),
        name: "Roboto",
        weight: 400,
      };
      mockGoogleFonts.mockImplementation(() =>
        Promise.resolve([uint8Font, descriptorFont])
      );
      const fetchFonts = createFetchFontsFromConfig(validConfig)!;

      const result = await fetchFonts("ar");

      expect(result).not.toBeNull();
      expect(result!.fonts).toHaveLength(2);
      expect(result!.fonts[0]).toBe(uint8Font);
      expect(result!.fonts[1]).toBe(descriptorFont);
      expect(result!.fontFamilies).toEqual(["Roboto"]);
    });

    it("filters font with null name from fontFamilies", async () => {
      mockGoogleFonts.mockImplementation(() =>
        Promise.resolve([
          { data: new Uint8Array([1]), name: null, weight: 400 } as never,
        ])
      );
      const fetchFonts = createFetchFontsFromConfig(validConfig)!;

      const result = await fetchFonts("ar");

      expect(result).not.toBeNull();
      expect(result!.fontFamilies).toEqual([]);
    });

    it("filters font with undefined name from fontFamilies", async () => {
      mockGoogleFonts.mockImplementation(() =>
        Promise.resolve([
          { data: new Uint8Array([1]), name: undefined, weight: 400 },
        ])
      );
      const fetchFonts = createFetchFontsFromConfig(validConfig)!;

      const result = await fetchFonts("ar");

      expect(result).not.toBeNull();
      expect(result!.fontFamilies).toEqual([]);
    });

    it("filters font with empty string name from fontFamilies", async () => {
      mockGoogleFonts.mockImplementation(() =>
        Promise.resolve([{ data: new Uint8Array([1]), name: "", weight: 400 }])
      );
      const fetchFonts = createFetchFontsFromConfig(validConfig)!;

      const result = await fetchFonts("ar");

      expect(result).not.toBeNull();
      expect(result!.fontFamilies).toEqual([]);
    });
  });

  describe("fetcher: edge case locale arguments", () => {
    const validConfig = { ar: [{ family: "Test Font", weights: [400] }] };

    it("returns null when called with undefined locale", async () => {
      const fetchFonts = createFetchFontsFromConfig(validConfig)!;

      const result = await fetchFonts(undefined as never);

      expect(result).toBeNull();
    });

    it("returns null when called with empty string locale that is not in config", async () => {
      const fetchFonts = createFetchFontsFromConfig(validConfig)!;

      const result = await fetchFonts("");

      expect(result).toBeNull();
    });
  });

  describe("fetcher: no memoization of failures", () => {
    const validConfig = { ar: [{ family: "Test Font", weights: [400] }] };

    it("retries after googleFonts rejects (no stale failure cache)", async () => {
      mockGoogleFonts
        .mockImplementationOnce(() => Promise.reject(new Error("temp failure")))
        .mockImplementationOnce(() =>
          Promise.resolve([
            { data: new Uint8Array([1, 2, 3]), name: "Roboto", weight: 400 },
          ])
        );
      const fetchFonts = createFetchFontsFromConfig(validConfig)!;

      const first = await fetchFonts("ar");
      const second = await fetchFonts("ar");

      expect(first).toBeNull();
      expect(second).not.toBeNull();
      expect(second!.fontFamilies).toEqual(["Roboto"]);
    });
  });

  describe("fetcher: local fonts — configDir resolution", () => {
    it("resolves local font path relative to configDir when provided", async () => {
      const fontBytes = Buffer.from([10, 11, 12]);
      mockReadFile.mockImplementation(() => Promise.resolve(fontBytes));

      const fetchFonts = createFetchFontsFromConfig(
        {
          en: [
            {
              family: "Config Dir Font",
              path: "./subdir/my-font.ttf",
              source: "local",
            },
          ],
        },
        "/tmp/test-studio-config"
      )!;

      const result = await fetchFonts("en");

      expect(result).not.toBeNull();
      const [descriptor] = result!.fonts;
      expect((descriptor as { name: string }).name).toBe("Config Dir Font");
      expect((descriptor as { data: unknown }).data).toBe(fontBytes);
      // readFile should have been called with the path resolved against configDir
      expect(mockReadFile).toHaveBeenCalledWith(
        "/tmp/test-studio-config/subdir/my-font.ttf"
      );
    });

    it("resolves local font path relative to CWD when configDir is not provided", async () => {
      const fontBytes = Buffer.from([20, 21, 22]);
      mockReadFile.mockImplementation(() => Promise.resolve(fontBytes));

      const fetchFonts = createFetchFontsFromConfig({
        en: [
          {
            family: "CWD Font",
            path: "./other-dir/font.woff2",
            source: "local",
          },
        ],
      })!;

      await fetchFonts("en");

      // Without configDir, path.resolve("./other-dir/font.woff2") uses CWD
      const cwd = process.cwd();
      expect(mockReadFile).toHaveBeenCalledWith(`${cwd}/other-dir/font.woff2`);
    });
  });

  describe("fetcher: local fonts", () => {
    it("returns FontDescriptor with file contents for local config", async () => {
      const fontBytes = Buffer.from([0, 1, 2, 3, 4]);
      mockReadFile.mockImplementation(() => Promise.resolve(fontBytes));

      const fetchFonts = createFetchFontsFromConfig({
        en: [
          {
            family: "My Local Font",
            path: "./fonts/my-font.woff2",
            source: "local",
          },
        ],
      })!;

      const result = await fetchFonts("en");

      expect(result).not.toBeNull();
      expect(result!.fonts).toHaveLength(1);
      const [descriptor] = result!.fonts;
      expect(descriptor).not.toBeInstanceOf(Uint8Array);
      expect((descriptor as { name: string }).name).toBe("My Local Font");
      expect((descriptor as { data: unknown }).data).toBe(fontBytes);
      expect((descriptor as { weight: unknown }).weight).toBe(400);
      expect(result!.fontFamilies).toEqual(["My Local Font"]);
    });

    it("uses custom weight from local config", async () => {
      const fontBytes = Buffer.from([10, 20]);
      mockReadFile.mockImplementation(() => Promise.resolve(fontBytes));

      const fetchFonts = createFetchFontsFromConfig({
        en: [
          {
            family: "Bold Font",
            path: "./fonts/bold.woff2",
            source: "local",
            weights: [700],
          },
        ],
      })!;

      const result = await fetchFonts("en");

      expect(result).not.toBeNull();
      expect((result!.fonts[0] as { weight: unknown }).weight).toBe(700);
    });

    it("returns null when local font file read fails", async () => {
      mockReadFile.mockImplementation(() =>
        Promise.reject(new Error("ENOENT: no such file"))
      );

      const fetchFonts = createFetchFontsFromConfig({
        en: [
          {
            family: "Missing Font",
            path: "./fonts/missing.woff2",
            source: "local",
          },
        ],
      })!;

      const result = await fetchFonts("en");

      expect(result).toBeNull();
    });

    it("mixes local and Google fonts in same locale", async () => {
      const fontBytes = Buffer.from([1, 2, 3]);
      mockReadFile.mockImplementation(() => Promise.resolve(fontBytes));

      const googleDescriptor = {
        data: new Uint8Array([9, 8, 7]),
        name: "Google Font",
        weight: 400,
      };
      mockGoogleFonts.mockImplementation(() =>
        Promise.resolve([googleDescriptor])
      );

      const fetchFonts = createFetchFontsFromConfig({
        en: [
          { family: "Local Font", path: "./fonts/local.ttf", source: "local" },
          { family: "Google Font", weights: [400] },
        ],
      })!;

      const result = await fetchFonts("en");

      expect(result).not.toBeNull();
      expect(result!.fonts).toHaveLength(2);
      expect((result!.fonts[0] as { name: string }).name).toBe("Local Font");
      expect((result!.fonts[1] as { name: string }).name).toBe("Google Font");
      expect(result!.fontFamilies).toEqual(["Local Font", "Google Font"]);
    });

    it("treats local config with missing path as Google font", async () => {
      const googleDescriptor = {
        data: new Uint8Array([1]),
        name: "Fallback Font",
        weight: 400,
      };
      mockGoogleFonts.mockImplementation(() =>
        Promise.resolve([googleDescriptor])
      );

      const fetchFonts = createFetchFontsFromConfig({
        en: [
          {
            family: "Fallback Font",
            source: "local",
          } as never,
        ],
      })!;

      const result = await fetchFonts("en");

      expect(result).not.toBeNull();
      expect(result!.fonts).toHaveLength(1);
      expect((result!.fonts[0] as { name: string }).name).toBe("Fallback Font");
    });

    it("treats local config with empty path as Google font", async () => {
      const googleDescriptor = {
        data: new Uint8Array([5]),
        name: "Empty Path Font",
        weight: 400,
      };
      mockGoogleFonts.mockImplementation(() =>
        Promise.resolve([googleDescriptor])
      );

      const fetchFonts = createFetchFontsFromConfig({
        en: [
          {
            family: "Empty Path Font",
            path: "",
            source: "local",
          },
        ],
      })!;

      const result = await fetchFonts("en");

      expect(result).not.toBeNull();
      expect(result!.fonts).toHaveLength(1);
      expect((result!.fonts[0] as { name: string }).name).toBe(
        "Empty Path Font"
      );
    });
  });
});
