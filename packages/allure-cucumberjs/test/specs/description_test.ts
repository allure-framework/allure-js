import { expect } from "chai";
import { describe, it } from "mocha";
import { ITestFormatterOptions, runFeatures } from "../helpers/formatter_helpers";
import { buildSupportCodeLibrary } from "../helpers/runtime_helpers";

const dataSet: { [name: string]: ITestFormatterOptions } = {
  featureDescription: {
    supportCodeLibrary: buildSupportCodeLibrary(({ Given }) => {
      Given("a step", () => {});
    }),
    sources: [
      {
        data: ["Feature: a", "Feature's description", "  Scenario: b", "  Given a step"].join("\n"),
        uri: "a.feature",
      },
    ],
  },
  scenarioDescription: {
    supportCodeLibrary: buildSupportCodeLibrary(({ Given }) => {
      Given("a step", () => {});
    }),
    sources: [
      {
        data: [
          "Feature: a",
          "Feature's description",
          "",
          "  Scenario: b",
          "  Description: Scenario's description",
          "  Given a step",
        ].join("\n"),
        uri: "a.feature",
      },
    ],
  },
};

describe("CucumberJSAllureReporter > description", () => {
  describe("with feature description", () => {
    it("uses feature description", async () => {
      const results = await runFeatures(dataSet.featureDescription);

      expect(results.tests).length(1);
      const [testResult] = results.tests;

      expect(testResult.description).eq("Feature's description");
    });
  });

  describe("with scenario description", () => {
    it("uses scenario description", async () => {
      const results = await runFeatures(dataSet.scenarioDescription);

      expect(results.tests).length(1);
      const [testResult] = results.tests;

      expect(testResult.description).eq("Description: Scenario's description");
    });
  });
});
