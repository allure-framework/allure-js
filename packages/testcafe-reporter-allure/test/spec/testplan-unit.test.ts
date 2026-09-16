import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createAllureTestPlanFilter } from "../../src/testplan.js";
import { createTempFixtureDir } from "../utils.js";

let tmpDir: string;
let originalTestPlanPath: string | undefined;

beforeEach(async () => {
  tmpDir = await createTempFixtureDir("testplan-unit");
  originalTestPlanPath = process.env.ALLURE_TESTPLAN_PATH;
});

afterEach(() => {
  process.env.ALLURE_TESTPLAN_PATH = originalTestPlanPath;
});

const writePlan = (plan: object) => {
  const planPath = join(tmpDir, "plan.json");
  writeFileSync(planPath, JSON.stringify(plan), "utf8");
  process.env.ALLURE_TESTPLAN_PATH = planPath;
  return planPath;
};

describe("createAllureTestPlanFilter", () => {
  it("returns undefined when ALLURE_TESTPLAN_PATH is not set", () => {
    delete process.env.ALLURE_TESTPLAN_PATH;
    expect(createAllureTestPlanFilter()).toBeUndefined();
  });

  it("returns undefined when test plan is empty", () => {
    writePlan({ version: "1.0", tests: [] });
    expect(createAllureTestPlanFilter()).toBeUndefined();
  });

  describe("selector matching", () => {
    it("includes test when selector matches exactly", () => {
      writePlan({ version: "1.0", tests: [{ selector: "tests/foo.js#My fixture#my test" }] });
      const filter = createAllureTestPlanFilter()!;
      expect(filter("my test", "My fixture", "tests/foo.js", {}, {})).toBe(true);
    });

    it("excludes test when selector does not match", () => {
      writePlan({ version: "1.0", tests: [{ selector: "tests/foo.js#My fixture#other test" }] });
      const filter = createAllureTestPlanFilter()!;
      expect(filter("my test", "My fixture", "tests/foo.js", {}, {})).toBe(false);
    });

    it("matches selector with absolute fixture path resolved to relative", () => {
      writePlan({ version: "1.0", tests: [{ selector: "tests/foo.js#My fixture#my test" }] });
      const filter = createAllureTestPlanFilter()!;
      expect(filter("my test", "My fixture", join(tmpDir, "tests/foo.js"), {}, {})).toBe(true);
    });
  });

  describe("allure id matching", () => {
    it("includes test when allure id from metadata matches plan id", () => {
      writePlan({ version: "1.0", tests: [{ id: 42 }] });
      const filter = createAllureTestPlanFilter()!;
      expect(filter("my test", "My fixture", "tests/foo.js", { "allure.id": "42" }, {})).toBe(true);
    });

    it("excludes test when allure id from metadata does not match plan id", () => {
      writePlan({ version: "1.0", tests: [{ id: 42 }] });
      const filter = createAllureTestPlanFilter()!;
      expect(filter("my test", "My fixture", "tests/foo.js", { "allure.id": "99" }, {})).toBe(false);
    });

    it("includes test when allure id from fixture metadata matches plan id", () => {
      writePlan({ version: "1.0", tests: [{ id: 42 }] });
      const filter = createAllureTestPlanFilter()!;
      expect(filter("my test", "My fixture", "tests/foo.js", {}, { "allure.id": "42" })).toBe(true);
    });

    it("includes test when allure id from title annotation matches plan id", () => {
      writePlan({ version: "1.0", tests: [{ id: 43 }] });
      const filter = createAllureTestPlanFilter()!;
      expect(filter("my test @allure.id=43", "My fixture", "tests/foo.js", {}, {})).toBe(true);
    });

    it("excludes test when allure id from title annotation does not match plan id", () => {
      writePlan({ version: "1.0", tests: [{ id: 43 }] });
      const filter = createAllureTestPlanFilter()!;
      expect(filter("my test @allure.id=44", "My fixture", "tests/foo.js", {}, {})).toBe(false);
    });

    it("test metadata allure id takes precedence over fixture metadata", () => {
      writePlan({ version: "1.0", tests: [{ id: 42 }] });
      const filter = createAllureTestPlanFilter()!;
      expect(filter("my test", "My fixture", "tests/foo.js", { "allure.id": "42" }, { "allure.id": "99" })).toBe(true);
    });
  });

  describe("cwd option", () => {
    it("resolves relative ALLURE_TESTPLAN_PATH from the given cwd", () => {
      const planPath = join(tmpDir, "plan.json");
      writeFileSync(planPath, JSON.stringify({ version: "1.0", tests: [{ id: 1 }] }), "utf8");
      process.env.ALLURE_TESTPLAN_PATH = "plan.json";
      const filter = createAllureTestPlanFilter({ cwd: tmpDir })!;
      expect(filter("t", "f", "f.js", { "allure.id": "1" }, {})).toBe(true);
    });
  });
});
