import { describe, expect, test } from "bun:test";

import { updatePackageJsonDeps } from "../../init/deps.js";

describe("updatePackageJsonDeps", () => {
  test("updates @stdout-design/cli to ^currentVersion", () => {
    const pkg = JSON.stringify(
      {
        dependencies: {
          "@stdout-design/cli": "^0.1.0",
          "@types/react": "^19.2.17",
        },
        name: "my-project",
        type: "module",
      },
      null,
      2
    );

    const result = updatePackageJsonDeps(pkg, "0.2.0");

    expect(result.changed).toBe(true);
    const parsed = JSON.parse(result.updated);
    expect(parsed.dependencies["@stdout-design/cli"]).toBe("^0.2.0");
  });

  test("leaves custom dependencies untouched", () => {
    const pkg = JSON.stringify(
      {
        dependencies: {
          "@stdout-design/cli": "^0.1.0",
          lodash: "^4.0.0",
          tailwindcss: "^3.0.0",
        },
        name: "my-project",
        type: "module",
      },
      null,
      2
    );

    const result = updatePackageJsonDeps(pkg, "0.2.0");

    const parsed = JSON.parse(result.updated);
    expect(parsed.dependencies.lodash).toBe("^4.0.0");
    expect(parsed.dependencies.tailwindcss).toBe("^3.0.0");
  });

  test("preserves non-dependency fields", () => {
    const pkg = JSON.stringify(
      {
        dependencies: {
          "@stdout-design/cli": "^0.1.0",
        },
        name: "my-project",
        private: true,
        scripts: {
          build: "studio build",
          dev: "studio dev",
        },
        type: "module",
      },
      null,
      2
    );

    const result = updatePackageJsonDeps(pkg, "0.2.0");

    const parsed = JSON.parse(result.updated);
    expect(parsed.name).toBe("my-project");
    expect(parsed.type).toBe("module");
    expect(parsed.scripts.dev).toBe("studio dev");
    expect(parsed.private).toBe(true);
  });

  test("reports changed: false when version is already current", () => {
    const pkg = JSON.stringify(
      {
        dependencies: {
          "@stdout-design/cli": "^0.2.0",
        },
        name: "my-project",
      },
      null,
      2
    );

    const result = updatePackageJsonDeps(pkg, "0.2.0");

    expect(result.changed).toBe(false);
  });

  test("adds @stdout-design/cli dependency if missing", () => {
    const pkg = JSON.stringify(
      {
        dependencies: {},
        name: "my-project",
      },
      null,
      2
    );

    const result = updatePackageJsonDeps(pkg, "0.2.0");

    expect(result.changed).toBe(true);
    const parsed = JSON.parse(result.updated);
    expect(parsed.dependencies["@stdout-design/cli"]).toBe("^0.2.0");
  });
});
