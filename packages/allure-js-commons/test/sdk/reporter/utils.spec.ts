import * as fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { LabelName } from "../../../src/model.js";
import { getRelativePath, getSuiteLabels } from "../../../src/sdk/reporter/utils.js";

describe("getSuiteLabels", () => {
  describe("with empty suites", () => {
    it("returns empty array", () => {
      expect(getSuiteLabels([])).toEqual([]);
    });
  });

  describe("with single suite", () => {
    it("returns parent suite label as the first element", () => {
      expect(getSuiteLabels(["foo"])).toEqual([
        {
          name: LabelName.PARENT_SUITE,
          value: "foo",
        },
      ]);
    });
  });

  describe("with two suites", () => {
    it("returns parent suite and suite labels as the first two elements", () => {
      expect(getSuiteLabels(["foo", "bar"])).toEqual([
        {
          name: LabelName.PARENT_SUITE,
          value: "foo",
        },
        {
          name: LabelName.SUITE,
          value: "bar",
        },
      ]);
    });
  });

  describe("with three or more suites", () => {
    it("returns list of three elements where last one is a sub suite label", () => {
      expect(getSuiteLabels(["foo", "bar", "baz", "beep", "boop"])).toEqual([
        {
          name: LabelName.PARENT_SUITE,
          value: "foo",
        },
        {
          name: LabelName.SUITE,
          value: "bar",
        },
        {
          name: LabelName.SUB_SUITE,
          value: "baz > beep > boop",
        },
      ]);
    });
  });
});

describe("getProjectName", () => {
  it("should cache the project name on subsequent calls", async () => {
    const tempDir = fs.mkdtempSync(path.join(tmpdir(), "allure-js-commons-project-name-"));
    const cwdSpy = vi.spyOn(process, "cwd");

    try {
      fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify({ name: "first-name" }), "utf8");
      cwdSpy.mockReturnValue(tempDir);
      vi.resetModules();
      const { getProjectName: getProjectNameFresh } = await import("../../../src/sdk/reporter/utils.js");

      expect(getProjectNameFresh()).toBe("first-name");

      fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify({ name: "second-name" }), "utf8");
      expect(getProjectNameFresh()).toBe("first-name");
    } finally {
      cwdSpy.mockRestore();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

describe("getRelativePath", () => {
  it("should keep relative path unchanged", () => {
    const filepath = path.join("test", "spec", "example.test.ts");
    const result = getRelativePath(filepath);
    expect(result).toBe(path.join("test", "spec", "example.test.ts"));
  });

  it("should handle absolute paths and make them project-relative", () => {
    const absolutePath = path.join(process.cwd(), "test", "spec", "example.test.ts");
    const result = getRelativePath(absolutePath);
    expect(result).toBe(path.join("test", "spec", "example.test.ts"));
  });
});
