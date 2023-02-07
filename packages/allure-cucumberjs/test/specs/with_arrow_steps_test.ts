import { LabelName, Status } from "allure-js-commons";
import { expect } from "chai";
import { describe, it } from "mocha";
import { CucumberAllureWorld } from "../../src/CucumberAllureWorld";
import { ITestFormatterOptions, runFeatures } from "../helpers/formatter_helpers";
import { buildSupportCodeLibrary } from "../helpers/runtime_helpers";

const dataSet: { [name: string]: ITestFormatterOptions } = {
  passed: {
    supportCodeLibrary: buildSupportCodeLibrary(({ Given, When, Then }) => {
      Given("a step", function () {});

      When("do something", async function (this: CucumberAllureWorld) {
        await this.step("first nested step", (step) => {
          step.label("label_name", "label_value");
        });
      });

      Then("get something", async function (this: CucumberAllureWorld) {
        await this.step("second nested step", (step) => {
          step.epic("foo");
          step.attach(JSON.stringify({ foo: "bar" }), "application/json");
        });
      });
    }),
    sources: [
      {
        data:
          "Feature: a\n" +
          "\n" +
          "  Scenario: b\n" +
          "    Given a step\n" +
          "    When do something\n" +
          "    Then get something\n",
        uri: "withNestedAnonymous.feature",
      },
    ],
  },
  failed: {
    supportCodeLibrary: buildSupportCodeLibrary(({ Given }) => {
      Given("a failed step", async function () {
        await this.step("failed step", () => {
          throw new Error("an error");
        });
      });
    }),
    sources: [
      {
        data: "Feature: a\n" + "\n" + "  Scenario: b\n" + "    Given a failed step\n",
        uri: "withNestedAnonymous.feature",
      },
    ],
  },
};

describe("CucumberJSAllureReporter > examples", () => {
  describe("passed", () => {
    it("should handle steps with anonymous handler function", async () => {
      const results = await runFeatures(dataSet.passed);
      expect(results.tests).length(1);

      const {
        labels,
        steps: [givenStep, whenStep, thenStep],
      } = results.tests[0];

      expect(labels.find((label) => label.name === "label_name")).eql({
        name: "label_name",
        value: "label_value",
      });
      expect(labels.find((label) => label.name === LabelName.EPIC)).eql({
        name: LabelName.EPIC,
        value: "foo",
      });
      expect(givenStep.steps).length(0);
      expect(whenStep.steps).length(1);
      expect(whenStep.steps[0].name).eq("first nested step");
      expect(whenStep.steps[0].attachments).length(0);
      expect(thenStep.steps).length(1);
      expect(thenStep.steps[0].name).eq("second nested step");
      expect(thenStep.steps[0].attachments).length(1);
    });

    it("should handle steps with arrow handler function", async () => {
      const results = await runFeatures(dataSet.passed);
      expect(results.tests).length(1);

      const {
        labels,
        steps: [givenStep, whenStep, thenStep],
      } = results.tests[0];

      expect(labels.find((label) => label.name === "label_name")).eql({
        name: "label_name",
        value: "label_value",
      });
      expect(labels.find((label) => label.name === LabelName.EPIC)).eql({
        name: LabelName.EPIC,
        value: "foo",
      });
      expect(givenStep.steps).length(0);
      expect(whenStep.steps).length(1);
      expect(whenStep.steps[0].name).eq("first nested step");
      expect(whenStep.steps[0].attachments).length(0);
      expect(thenStep.steps).length(1);
      expect(thenStep.steps[0].name).eq("second nested step");
      expect(thenStep.steps[0].attachments).length(1);
    });
  });

  describe("failed", () => {
    it("marks parent test as failed", async () => {
      const results = await runFeatures(dataSet.failed);
      expect(results.tests).length(1);

      expect(results.tests[0].status).eq(Status.FAILED);

      const {
        steps: [givenStep],
      } = results.tests[0];

      expect(givenStep.steps).length(1);
      expect(givenStep.steps[0].name).eq("failed step");
    });
  });
});
