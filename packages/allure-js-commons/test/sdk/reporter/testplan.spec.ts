import { randomUUID } from "crypto";
import { mkdtempSync, writeFileSync } from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import type { Label } from "../../../src/model.js";
import {
  addSkipLabel,
  addSkipLabelAsMeta,
  hasSkipLabel,
  includedInTestPlan,
  parseTestPlan,
} from "../../../src/sdk/reporter/testplan.js";
import type { TestPlanV1 } from "../../../src/sdk/types.js";

const originalEnv = process.env;
const tmpDir = mkdtempSync(path.join(os.tmpdir(), "test-"));

afterEach(() => {
  process.env = originalEnv;
});

const writeToTempFile = (val: any) => {
  const filename = path.join(tmpDir, `${randomUUID()}.json`);
  writeFileSync(filename, JSON.stringify(val));
  return filename;
};

describe("parseTestPlan", () => {
  it("should return testplan", () => {
    const exampleTestPlan = {
      version: "1.0",
      tests: [
        {
          id: 1,
          selector: "some strange text",
        },
      ],
    };

    process.env = {
      ...originalEnv,
      ALLURE_TESTPLAN_PATH: writeToTempFile(exampleTestPlan),
    };

    const res = parseTestPlan();

    expect(res).toEqual(exampleTestPlan);
  });

  it("should return undefiend if ALLURE_TESTPLAN_PATH not set", () => {
    const res = parseTestPlan();

    expect(res).toBeUndefined();
  });

  it("should return undefiend if testplan have 0 tests", () => {
    const exampleTestPlan = {
      version: "1.0",
      tests: [],
    };

    process.env = {
      ...originalEnv,
      ALLURE_TESTPLAN_PATH: writeToTempFile(exampleTestPlan),
    };

    const res = parseTestPlan();

    expect(res).toBeUndefined();
  });

  it("should return undefined if file don't exist", () => {
    process.env = {
      ...originalEnv,
      ALLURE_TESTPLAN_PATH: "some-strange-path.json",
    };

    const res = parseTestPlan();

    expect(res).toBeUndefined();
  });
});

describe("includedInTestPlan", () => {
  it("should match @allure.id tag", () => {
    const exampleTestPlan: TestPlanV1 = {
      version: "1.0",
      tests: [
        {
          id: 123,
          selector: "some strange text",
        },
      ],
    };

    const r1 = includedInTestPlan(exampleTestPlan, { tags: ["@allure.id=123"] });
    expect(r1).toBe(true);

    const r2 = includedInTestPlan(exampleTestPlan, { tags: ["@allure.id=122"] });
    expect(r2).toBe(false);
  });
  it("should match by id", () => {
    const exampleTestPlan: TestPlanV1 = {
      version: "1.0",
      tests: [
        {
          id: 123,
          selector: "some strange text",
        },
      ],
    };

    const r1 = includedInTestPlan(exampleTestPlan, { id: "123", tags: ["@allure.id=133"] });
    expect(r1).toBe(true);

    const r2 = includedInTestPlan(exampleTestPlan, { id: "442", tags: ["@allure.id=123"] });
    expect(r2).toBe(false);
  });
});

describe("skip labels", () => {
  describe("addSkipLabel", () => {
    it("should add the label", () => {
      const labels: Label[] = [];
      addSkipLabel(labels);

      expect(labels).toEqual([{ name: "ALLURE_TESTPLAN_SKIP", value: "true" }]);
    });
  });

  describe("addSkipLabelAsMeta", () => {
    it("should append the label meta to the name", () => {
      const newName = addSkipLabelAsMeta("name");

      expect(newName).toEqual("name @allure.label.ALLURE_TESTPLAN_SKIP:true");
    });
  });

  describe("hasSkipLabel", () => {
    it("should return true is the label is present", () => {
      const value = hasSkipLabel([
        { name: "foo", value: "bar" },
        { name: "ALLURE_TESTPLAN_SKIP", value: "<not checked>" },
      ]);

      expect(value).toBe(true);
    });

    it("should return false is the label is not present", () => {
      const value = hasSkipLabel([{ name: "foo", value: "bar" }]);

      expect(value).toBe(false);
    });
  });
});
