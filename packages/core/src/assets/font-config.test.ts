// oxlint-disable typescript/no-non-null-assertion
import { afterEach, describe, expect, it, mock } from "bun:test";

const mockGoogleFonts = mock(() => Promise.resolve([]));

mock.module("@takumi-rs/helpers", () => ({
  googleFonts: mockGoogleFonts,
}));

afterEach(() => {
  mockGoogleFonts.mockImplementation(() => Promise.resolve([]));
});

const { createFetchFontsFromConfig } = await import("./font-config.js");

describe("createFetchFontsFromConfig", () => {
  describe("factory: fontsConfig parameter", () => {
    it("returns undefined when fontsConfig is undefined", () => {
      const result = createFetchFontsFromConfig();

      expect(result).toBeUndefined();
    });

    it("returns undefined when fontsConfig is null", () => {
      const result = createFetchFontsFromConfig(null);

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
      const fetchFonts = createFetchFontsFromConfig({ ar: null })!;

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
          { data: new Uint8Array([1]), name: null, weight: 400 },
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
});
