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

const writeRawToTempFile = (val: string) => {
  const filename = path.join(tmpDir, `${randomUUID()}.json`);
  writeFileSync(filename, val);
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

  it.each([{ id: 2 }, { selector: "sample#test" }])("should accept muted-only plans with %j when enabled", (entry) => {
    process.env = {
      ...originalEnv,
      ALLURE_TESTPLAN_PATH: writeToTempFile({ version: "1.0", mutedTests: [entry] }),
    };

    const defaultPlan = parseTestPlan();
    const mutedPlan = parseTestPlan({ includeMutedTests: true });

    expect(defaultPlan).toBeUndefined();
    expect(mutedPlan).toEqual({ version: "1.0", tests: [], mutedTests: [entry] });
  });

  it("should accept empty selection with muted entries when enabled", () => {
    const plan = { version: "1.0", tests: [], mutedTests: [{ id: 2 }] };
    process.env = { ...originalEnv, ALLURE_TESTPLAN_PATH: writeToTempFile(plan) };

    const result = parseTestPlan({ includeMutedTests: true });

    expect(result).toEqual(plan);
  });

  it.each([undefined, [], "invalid"])("should ignore ineffective muted collections %j when enabled", (mutedTests) => {
    process.env = {
      ...originalEnv,
      ALLURE_TESTPLAN_PATH: writeToTempFile({ version: "1.0", mutedTests }),
    };

    const result = parseTestPlan({ includeMutedTests: true });

    expect(result).toBeUndefined();
  });

  it("should reject malformed selection even with valid muted entries", () => {
    process.env = {
      ...originalEnv,
      ALLURE_TESTPLAN_PATH: writeToTempFile({ version: "1.0", tests: "invalid", mutedTests: [{ id: 2 }] }),
    };

    const result = parseTestPlan({ includeMutedTests: true });

    expect(result).toBeUndefined();
  });

  it("should return undefiend if ALLURE_TESTPLAN_PATH not set", () => {
    process.env = {
      ...originalEnv,
    };
    delete process.env.ALLURE_TESTPLAN_PATH;

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

  it("should return undefined if testplan tests are missing", () => {
    const exampleTestPlan = {
      version: "1.0",
    };

    process.env = {
      ...originalEnv,
      ALLURE_TESTPLAN_PATH: writeToTempFile(exampleTestPlan),
    };

    const res = parseTestPlan();

    expect(res).toBeUndefined();
  });

  it("should return undefined if testplan tests are not an array", () => {
    const exampleTestPlan = {
      version: "1.0",
      tests: "not an array",
    };

    process.env = {
      ...originalEnv,
      ALLURE_TESTPLAN_PATH: writeToTempFile(exampleTestPlan),
    };

    const res = parseTestPlan();

    expect(res).toBeUndefined();
  });

  it("should return undefined if testplan version is unsupported", () => {
    const exampleTestPlan = {
      version: "2.0",
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

    expect(res).toBeUndefined();
  });

  it("should return undefined if testplan is invalid JSON", () => {
    process.env = {
      ...originalEnv,
      ALLURE_TESTPLAN_PATH: writeRawToTempFile("{"),
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
  it.each([
    { entry: { id: 123 }, subject: { id: "123" } },
    { entry: { id: "123" }, subject: { id: "123" } },
    { entry: { id: 123 }, subject: { allureId: "123", id: "442", tags: ["@allure.id=442"] } },
    { entry: { id: 123 }, subject: { id: "123", tags: ["@allure.id=442"] } },
    { entry: { id: 123 }, subject: { tags: ["unrelated", "@allure.id=123"] } },
    { entry: { selector: "selected" }, subject: {} },
    { entry: { selector: "native://test" }, subject: { nativeSelector: "native://test" } },
    { entry: { id: 442, selector: "selected" }, subject: { id: "123" } },
  ])("should exclude a selected test matching muted identity %j", ({ entry, subject }) => {
    const plan: TestPlanV1 = {
      version: "1.0",
      tests: [{ selector: "selected" }],
      mutedTests: [entry],
    };

    const result = includedInTestPlan(plan, { fullName: "selected", ...subject }, { enableMutedTests: true });

    expect(result).toBe(false);
  });

  it.each([
    { subject: { allureId: "442", id: "123", tags: ["@allure.id=123"] }, expected: true },
    { subject: { id: "442", tags: ["@allure.id=123"] }, expected: true },
    { subject: { tags: ["unrelated"] }, expected: true },
    { subject: {}, expected: true },
    { subject: { id: "123" }, expected: false },
  ])("should filter muted-only plans for %j", ({ subject, expected }) => {
    const plan: TestPlanV1 = { version: "1.0", tests: [], mutedTests: [{ id: 123 }] };

    const result = includedInTestPlan(plan, subject, { enableMutedTests: true });

    expect(result).toBe(expected);
  });

  it.each([
    { fullName: "selected", expected: true },
    { fullName: "muted", expected: false },
    { fullName: "unselected", expected: false },
  ])("should combine selection and muting for $fullName", ({ fullName, expected }) => {
    const plan: TestPlanV1 = {
      version: "1.0",
      tests: [{ selector: "selected" }, { selector: "muted" }],
      mutedTests: [{ selector: "muted" }],
    };

    const result = includedInTestPlan(plan, { fullName }, { enableMutedTests: true });

    expect(result).toBe(expected);
  });

  it("should ignore muted entries unless enabled", () => {
    const plan: TestPlanV1 = { version: "1.0", tests: [{ id: 123 }], mutedTests: [{ id: 123 }] };

    const result = includedInTestPlan(plan, { id: "123" });

    expect(result).toBe(true);
  });

  it.each([undefined, []])("should include tests when both collections are empty (%j)", (mutedTests) => {
    const plan: TestPlanV1 = { version: "1.0", tests: [], mutedTests };

    const defaultResult = includedInTestPlan(plan, {});
    const enabledResult = includedInTestPlan(plan, {}, { enableMutedTests: true });

    expect(defaultResult).toBe(true);
    expect(enabledResult).toBe(true);
  });

  it("should mute when test plans provides only muted tests", () => {
    const plan: TestPlanV1 = { version: "1.0", tests: [], mutedTests: [{ id: 123 }] };

    const result = includedInTestPlan(plan, { id: "123" }, { enableMutedTests: true });

    expect(result).toBe(false);
  });

  it("should not match absent subject fields against absent muted fields", () => {
    const plan: TestPlanV1 = { version: "1.0", tests: [], mutedTests: [{}] };

    const result = includedInTestPlan(plan, {}, { enableMutedTests: true });

    expect(result).toBe(true);
  });

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

  it("should match @allure.id metadata from a full test name", () => {
    const exampleTestPlan: TestPlanV1 = {
      version: "1.0",
      tests: [
        {
          id: 77,
          selector: "Suite > a different test",
        },
      ],
    };

    const result = includedInTestPlan(exampleTestPlan, {
      fullName: "Suite > case @allure.id=77",
      tags: ["Suite > case @allure.id=77"],
    });

    expect(result).toBe(true);
  });

  it("should match full test names by selector", () => {
    const exampleTestPlan: TestPlanV1 = {
      version: "1.0",
      tests: [
        {
          selector: "Suite > selected test",
        },
      ],
    };

    expect(includedInTestPlan(exampleTestPlan, { fullName: "Suite > selected test" })).toBe(true);
    expect(includedInTestPlan(exampleTestPlan, { fullName: "Suite > other test" })).toBe(false);
  });

  it("should match native selectors by selector", () => {
    const exampleTestPlan: TestPlanV1 = {
      version: "1.0",
      tests: [
        {
          selector: "native://suite/test",
        },
      ],
    };

    expect(includedInTestPlan(exampleTestPlan, { nativeSelector: "native://suite/test" })).toBe(true);
    expect(includedInTestPlan(exampleTestPlan, { nativeSelector: "native://suite/other-test" })).toBe(false);
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

  it("should match by explicit allureId", () => {
    const exampleTestPlan: TestPlanV1 = {
      version: "1.0",
      tests: [
        {
          id: 123,
          selector: "some strange text",
        },
      ],
    };

    const r1 = includedInTestPlan(exampleTestPlan, { allureId: "123", tags: ["@allure.id=133"] });
    expect(r1).toBe(true);

    const r2 = includedInTestPlan(exampleTestPlan, { allureId: "442", tags: ["@allure.id=123"] });
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
