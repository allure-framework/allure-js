import { expect } from "chai";
import { describe, it } from "mocha";
import { ITestFormatterOptions, runFeatures } from "../helpers/formatter_helpers";
import { buildSupportCodeLibrary } from "../helpers/runtime_helpers";

const dataSet: { [name: string]: ITestFormatterOptions } = {
  stepArguments: {
    supportCodeLibrary: buildSupportCodeLibrary(({ Given, When, Then }) => {
      Given(/^a is (\d+)$/, (_) => {});
      Given(/^b is (\d+)$/, (_) => {});
      When(/^I add a to b$/, () => {});
      Then(/^result is (\d+)$/, (_) => {});
    }),
    sources: [
      {
        data: [
          "Feature: simple math",
          "Scenario: plus operator",
          "Given a is 5",
          "Given b is 10",
          "When I add a to b",
          "Then result is 15",
        ].join("\n"),
        uri: "math.feature",
      },
    ],
  },
};

describe("CucumberJSAllureReporter > step arguments", () => {
  it("should set steps", async () => {
    const results = await runFeatures(dataSet.stepArguments);

    const [testResult] = results.tests;

    expect(testResult.steps.map((step) => step.name)).eql([
      "Given a is 5",
      "Given b is 10",
      "When I add a to b",
      "Then result is 15",
    ]);
  });
});
