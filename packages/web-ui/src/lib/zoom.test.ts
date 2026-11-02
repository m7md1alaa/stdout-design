import { describe, expect, it } from "bun:test";

import { fitScale, formatZoom, resolveZoom, stepZoom } from "./zoom";

describe("fitScale", () => {
  const preset = { height: 630, width: 1200 };

  it("shrinks to the tighter axis", () => {
    expect(fitScale({ height: 1000, width: 600 }, preset)).toBe(0.5);
  });

  it("never scales above 100%", () => {
    expect(fitScale({ height: 5000, width: 5000 }, preset)).toBe(1);
  });

  it("returns 1 before the area has been measured", () => {
    expect(fitScale({ height: 0, width: 0 }, preset)).toBe(1);
  });
});

describe("stepZoom", () => {
  it("steps to the next fixed value from a fitted scale", () => {
    expect(stepZoom(0.62, 1)).toBe(0.75);
    expect(stepZoom(0.62, -1)).toBe(0.5);
  });

  it("moves off an exact step", () => {
    expect(stepZoom(1, 1)).toBe(1.5);
    expect(stepZoom(1, -1)).toBe(0.75);
  });

  it("reports the limits", () => {
    expect(stepZoom(4, 1)).toBe("limit");
    expect(stepZoom(0.25, -1)).toBe("limit");
  });
});

describe("resolveZoom and formatZoom", () => {
  it("resolves fit to the fit scale", () => {
    expect(resolveZoom("fit", 0.62)).toBe(0.62);
    expect(resolveZoom(2, 0.62)).toBe(2);
  });

  it("rounds to a whole percent", () => {
    expect(formatZoom(0.6234)).toBe("62%");
  });
});
