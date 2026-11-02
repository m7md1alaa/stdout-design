import { describe, expect, it } from "bun:test";

import { parseIssues } from "./http-render-adapter";

describe("parseIssues", () => {
  it("reads the dotted field name the server sends", () => {
    expect(
      parseIssues({
        issues: [
          {
            code: "too_small",
            field: "categories",
            message: "must be at least 3 item(s)",
          },
          { code: "invalid_type", field: "stats.1.label", message: "required" },
        ],
      })
    ).toEqual([
      {
        code: "too_small",
        message: "must be at least 3 item(s)",
        path: "categories",
      },
      { code: "invalid_type", message: "required", path: "stats.1.label" },
    ]);
  });

  it("falls back to a path array", () => {
    expect(
      parseIssues({ issues: [{ code: "x", message: "m", path: ["a", 0] }] })
    ).toEqual([{ code: "x", message: "m", path: "a.0" }]);
  });

  it("returns undefined when there are no issues", () => {
    expect(parseIssues({ error: "boom" })).toBeUndefined();
  });
});
