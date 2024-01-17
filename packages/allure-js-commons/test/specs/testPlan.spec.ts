import { expect } from "chai";
import { randomUUID } from "crypto";
import { mkdtempSync, writeFileSync } from "fs";
import os from "os";
import path from "path";
import { parseTestPlan } from "../../dist";

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

  expect(res).to.eql(exampleTestPlan);
});

it("should return undefiend if ALLURE_TESTPLAN_PATH not set", () => {
  const res = parseTestPlan();
  expect(res).to.be.undefined;
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
  expect(res).to.be.undefined;
});

it("should return undefiend if file don't exist", () => {
  process.env = {
    ...originalEnv,
    ALLURE_TESTPLAN_PATH: "some-strange-path.json",
  };

  const res = parseTestPlan();
  expect(res).to.be.undefined;
});
