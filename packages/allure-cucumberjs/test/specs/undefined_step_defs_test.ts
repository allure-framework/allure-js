import { LabelName, Status } from "allure-js-commons";
import { expect } from "chai";
import { describe, it } from "mocha";
import { CucumberAllureWorld } from "../../src/CucumberAllureWorld";
import { ITestFormatterOptions, runFeatures } from "../helpers/formatter_helpers";
import { buildSupportCodeLibrary } from "../helpers/runtime_helpers";

const dataSet: { [name: string]: ITestFormatterOptions } = {
  withoutDefinedStepDefs: {
    supportCodeLibrary: buildSupportCodeLibrary(({ Given, When, Then }) => {
      Given("a step", function () {});
    }),
    sources: [
      {
        data: "Feature: a\n" + "\n" + "  Scenario: b\n" + "    Given an another step\n",
        uri: "withUndefinedStep.feature",
      },
    ],
  },
};

describe("CucumberJSAllureReporter > with anonymous steps", () => {
  it("provides details message that test doesn't have step definition", async () => {
    const results = await runFeatures(dataSet.withoutDefinedStepDefs);
    expect(results.tests).length(1);
    expect(results.tests[0].status).eq(undefined);
    expect(results.tests[0].statusDetails.message).eq("The test doesn't have an implementation.");
  });
});
