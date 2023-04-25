import { expect } from "chai";
import { describe, it } from "mocha";
import { ITestFormatterOptions, runFeatures } from "../helpers/formatter_helpers";
import { buildSupportCodeLibrary } from "../helpers/runtime_helpers";

const dataSet: { [name: string]: ITestFormatterOptions } = {
  examples: {
    supportCodeLibrary: buildSupportCodeLibrary(({ Given, When, Then }) => {
      Given(/^throws an error$/, (_) => {
        throw new Error("Error message");
      });
    }),
    sources: [
      {
        data:
          "Feature: Test Scenarios with exception formatter\n" +
          "\n" +
          "  Scenario Outline: Scenario with exception inside\n" +
          "    Given throws an error\n",
        uri: "exceptionFormatter.feature",
      },
    ],
  },
};

describe("CucumberJSAllureReporter > exception formatter", () => {
  describe("with exception formatter", () => {
    it("formats error messages with given formatter function", async () => {
      const results = await runFeatures(dataSet.examples, {
        exceptionFormatter: (error) => `Formatted ${error.toLowerCase()}`,
      });

      expect(results.tests).length(1);

      const [firstTest] = results.tests;
      const { steps } = firstTest;

      expect(steps).length(1);
      console.log(steps[0].statusDetails.message);
      expect(steps[0].statusDetails.message).contains("Formatted error: error message");
    });
  });

  describe("without exception formatter", () => {
    it("keeps an error message without changes", async () => {
      const results = await runFeatures(dataSet.examples);

      expect(results.tests).length(1);

      const [firstTest] = results.tests;
      const { steps } = firstTest;

      expect(steps).length(1);
      console.log(steps[0].statusDetails.message);
      expect(steps[0].statusDetails.message).contains("Error: Error message");
    });
  });
});
