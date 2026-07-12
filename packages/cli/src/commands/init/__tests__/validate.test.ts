import { describe, expect, test } from "bun:test";

import { validateProjectName } from "../validate.js";

describe("validateProjectName", () => {
  test("rejects empty name", () => {
    expect(validateProjectName("")).toBe("Project name cannot be empty.");
  });

  test("rejects name over 214 characters", () => {
    expect(validateProjectName("a".repeat(215))).toBe(
      "Project name must be 214 characters or fewer."
    );
  });

  test("rejects name starting with uppercase", () => {
    expect(validateProjectName("Abc")).toBe(
      "Project name must start with a lowercase letter or number, and can only contain letters, numbers, dots, hyphens, and underscores."
    );
  });

  test("accepts valid name", () => {
    expect(validateProjectName("my-project")).toBeNull();
  });

  test("rejects name ending with special character", () => {
    expect(validateProjectName("my-project-")).toBe(
      "Project name must not end with a dot, hyphen, or underscore."
    );
  });

  test("rejects consecutive underscores", () => {
    expect(validateProjectName("my__project")).toBe(
      "Project name must not contain consecutive underscores."
    );
  });

  test("rejects consecutive hyphens", () => {
    expect(validateProjectName("my--project")).toBe(
      "Project name must not contain consecutive dots, hyphens, or underscores."
    );
  });

  test("allows dots and hyphens in body", () => {
    expect(validateProjectName("my.project-v2")).toBeNull();
  });

  test("accepts single lowercase character", () => {
    expect(validateProjectName("a")).toBeNull();
  });

  test("accepts name exactly 214 characters", () => {
    expect(validateProjectName("a".repeat(214))).toBeNull();
  });

  test("accepts name starting with number", () => {
    expect(validateProjectName("123")).toBeNull();
  });

  test("accepts name with numbers", () => {
    expect(validateProjectName("test123-studio")).toBeNull();
  });

  test("rejects consecutive dots", () => {
    expect(validateProjectName("my..project")).toBe(
      "Project name must not contain consecutive dots, hyphens, or underscores."
    );
  });

  test("rejects name starting with a dot", () => {
    expect(validateProjectName(".project")).toBe(
      "Project name must start with a lowercase letter or number, and can only contain letters, numbers, dots, hyphens, and underscores."
    );
  });

  test("rejects name with special characters", () => {
    expect(validateProjectName("hello!world")).toBe(
      "Project name must start with a lowercase letter or number, and can only contain letters, numbers, dots, hyphens, and underscores."
    );
  });

  test("accepts name with underscore in body", () => {
    expect(validateProjectName("my_project")).toBeNull();
  });
});
