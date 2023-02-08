import { md5, Status } from "allure-js-commons";
import { expect } from "chai";
import { describe, it } from "mocha";
import { ITestFormatterOptions, runFeatures } from "../helpers/formatter_helpers";
import { buildSupportCodeLibrary } from "../helpers/runtime_helpers";

const dataSet: { [name: string]: ITestFormatterOptions } = {
  passed: {
    supportCodeLibrary: buildSupportCodeLibrary(({ Given }) => {
      Given("a step", () => {});
    }),
    sources: [
      {
        data: ["Feature: a", "Scenario: b", "Given a step"].join("\n"),
        uri: "a.feature",
      },
    ],
  },
  failed: {
    supportCodeLibrary: buildSupportCodeLibrary(({ Given }) => {
      Given("failed step", () => {
        expect(123).eq(2225);
      });
    }),
    sources: [
      {
        data: ["Feature: failed", "Scenario: failed scenario", "Given failed step"].join("\n"),
        uri: "b.feature",
      },
    ],
  },
};

describe("CucumberJSAllureReporter > simple", () => {
  describe("passed", () => {
    it("sets name", async () => {
      const results = await runFeatures(dataSet.passed);

      expect(results.tests).length(1);
      const [testResult] = results.tests;

      expect(testResult.name).eq("b");
    });

    it("sets passed status", async () => {
      const results = await runFeatures(dataSet.passed);

      expect(results.tests).length(1);
      const [testResult] = results.tests;

      expect(testResult.status).eq(Status.PASSED);
    });

    it("sets timings", async () => {
      const before = Date.now();
      const results = await runFeatures(dataSet.passed);
      const after = Date.now();

      expect(results.tests).length(1);
      const [testResult] = results.tests;

      expect(testResult.start).greaterThanOrEqual(before);
      expect(testResult.start).lessThanOrEqual(after);
      expect(testResult.stop).greaterThanOrEqual(before);
      expect(testResult.stop).lessThanOrEqual(after);
      expect(testResult.start).lessThanOrEqual(testResult.stop!);
    });

    it("processes scenario parameters", async () => {
      const results = await runFeatures(dataSet.passed);

      expect(results.tests).length(1);

      const [testResult] = results.tests;
      expect(testResult.name).eq("b");
    });

    it("sets fullName, testCaseId and historyId", async () => {
      const results = await runFeatures(dataSet.passed);

      expect(results.tests).length(1);
      const [testResult] = results.tests;
      const source = dataSet.passed.sources?.[0];

      const name = source!.data.match(/\nScenario: (.+)\n/)?.[1];
      const fullName = `${source!.uri}#${name!}`;
      expect(testResult.fullName).eq(fullName);
      expect(testResult.testCaseId).eq(md5(fullName));
      expect(testResult.historyId).eq(testResult.testCaseId);
    });
  });

  describe("failed", () => {
    it("sets failed status", async () => {
      const results = await runFeatures(dataSet.failed);

      expect(results.tests).length(1);
      const [testResult] = results.tests;

      expect(testResult.status).eq(Status.FAILED);
      expect(testResult.statusDetails.message)
        .contains("AssertionError")
        .contains("123")
        .contains("2225");
    });
  });
});
