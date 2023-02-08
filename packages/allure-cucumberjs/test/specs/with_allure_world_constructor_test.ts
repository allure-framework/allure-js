import { Status } from "allure-js-commons";
import { expect } from "chai";
import { describe, it } from "mocha";
import { CucumberAllureWorld } from "../../src/CucumberAllureWorld";
import { ITestFormatterOptions, runFeatures } from "../helpers/formatter_helpers";
import { buildSupportCodeLibrary } from "../helpers/runtime_helpers";

const dataSet: { [name: string]: ITestFormatterOptions } = {
  withCustomWorldConstructor: {
    supportCodeLibrary: buildSupportCodeLibrary(({ Given, When, setWorldConstructor }) => {
      class CustomWorld extends CucumberAllureWorld {
        customWorldMethod() {}
      }

      setWorldConstructor(CustomWorld);

      Given("a step", function () {});

      When("world say hello", function (this: CustomWorld) {
        this.customWorldMethod();
      });
    }),
    sources: [
      {
        data:
          "Feature: a\n" +
          "\n" +
          "  Scenario: b\n" +
          "    Given a step\n" +
          "    When world say hello\n",
        uri: "withNestedAnonymous.feature",
      },
    ],
  },
};

describe("CucumberJSAllureReporter > examples", () => {
  it("should applied custom world constructor", async () => {
    const results = await runFeatures(dataSet.withCustomWorldConstructor);
    expect(results.tests).length(1);
    expect(results.tests[0].statusDetails.message).eq(undefined);
    expect(results.tests[0].status).eq(Status.PASSED);
  });
});
