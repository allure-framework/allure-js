import { LabelName, Status } from "allure-js-commons";
import { expect } from "chai";
import { describe, it } from "mocha";
import { CucumberAllureWorld } from "../../src/CucumberAllureWorld";
import { ITestFormatterOptions, runFeatures } from "../helpers/formatter_helpers";
import { buildSupportCodeLibrary } from "../helpers/runtime_helpers";

const dataSet: { [name: string]: ITestFormatterOptions } = {
  withoutTestImplementation: {
    supportCodeLibrary: buildSupportCodeLibrary(({ Given, When, Then }) => {
      Given("a step", function () {});
    }),
    sources: [
      {
        data: "Feature: a\n" + "\n" + "  Scenario: b\n" + "    Given an another step\n",
        uri: "withUndefinedTest.feature",
      },
    ],
  },
  withoutStepImplementation: {
    supportCodeLibrary: buildSupportCodeLibrary(({ Given, When, Then }) => {
      Given("a step", function () {});
      Then("result actually is", function () {});
    }),
    sources: [
      {
        data: "Feature: a\n\n" + "  Scenario: b\n" + "    Given a step\n" + "    Then result is\n",
        uri: "withUndefinedStep.feature",
      },
    ],
  },
};

describe("CucumberJSAllureReporter > with anonymous steps", () => {
  it("provides details message that test doesn't have implementation", async () => {
    const results = await runFeatures(dataSet.withoutTestImplementation);
    expect(results.tests).length(1);
    expect(results.tests[0].status).eq(undefined);
    expect(results.tests[0].statusDetails.message).eq("The test doesn't have an implementation.");
  });

  it("provides details message that step doesn't have implementation", async () => {
    const results = await runFeatures(dataSet.withoutStepImplementation);
    expect(results.tests[0].steps).length(2);
    expect(results.tests[0].steps[0].status).eq(Status.PASSED);
    expect(results.tests[0].steps[1].status).eq(undefined);
    expect(results.tests[0].steps[1].statusDetails.message).eq(
      "The step doesn't have an implementation.",
    );
  });
});
