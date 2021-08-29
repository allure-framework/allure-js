import { buildSupportCodeLibrary } from "../helpers/runtime_helpers";
import { ITestFormatterOptions, runFeatures } from "../helpers/formatter_helpers";
import { Status } from "allure-js-commons";
import { expect } from "chai";

const dataSet: { [name: string]: ITestFormatterOptions } = {
  simple: {
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
  examples: {
    supportCodeLibrary: buildSupportCodeLibrary(({ Given, When, Then }) => {
      Given(/^a is (\d+)$/, (_) => {});
      Given(/^b is (\d+)$/, (_) => {});
      When(/^I add a to b$/, () => {});
      Then(/^result is (\d+)$/, (_) => {});
    }),
    sources: [
      {
        data:
          "Feature: Test Scenarios with Examples\n" +
          "\n" +
          "  Scenario Outline: Scenario with Positive Examples\n" +
          "    Given a is <a>\n" +
          "    And b is <b>\n" +
          "    When I add a to b\n" +
          "    Then result is <result>\n" +
          "    Examples:\n" +
          "      | a | b | result |\n" +
          "      | 1 | 3 | 4      |\n" +
          "      | 2 | 4 | 6      |\n",
        uri: "examples.feature",
      },
    ],
  },
  attachments: {
    supportCodeLibrary: buildSupportCodeLibrary(({ Given }) => {
      Given("a step", (world) => {
        console.log("bhas", world.attach)
        world.attach("some text")
      });
    }),
    sources: [
      {
        data: ["Feature: attachments", "Scenario: add text attachment", "Given a step"].join("\n"),
        uri: "attachment.feature",
      },
    ],
  },
};

describe("CucumberJSAllureReporter", async () => {
  it("should set name", async () => {
    const results = await runFeatures(dataSet.simple);

    expect(results.tests).length(1);
    const [testResult] = results.tests;

    expect(testResult.name).eq("b");
  });

  it("should set steps", async () => {
    const results = await runFeatures(dataSet.stepArguments);

    const [testResult] = results.tests;

    expect(testResult.steps.map((step) => step.name)).to.have.all.members([
      "Given a is 5",
      "Given b is 10",
      "When I add a to b",
      "Then result is 15",
    ]);
  });

  it("should set passed status if no error", async () => {
    const results = await runFeatures(dataSet.simple);

    expect(results.tests).length(1);
    const [testResult] = results.tests;

    expect(testResult.status).eq(Status.PASSED);
  });

  it("should set failed status if expectation failed", async () => {
    const results = await runFeatures(dataSet.failed);

    expect(results.tests).length(1);
    const [testResult] = results.tests;

    expect(testResult.status).eq(Status.FAILED);
    expect(testResult.statusDetails.message)
      .contains("AssertionError")
      .contains("123")
      .contains("2225");
  });

  it("should set timings", async () => {
    const before = Date.now();
    const results = await runFeatures(dataSet.simple);
    const after = Date.now();

    expect(results.tests).length(1);
    const [testResult] = results.tests;

    expect(testResult.start).greaterThanOrEqual(before);
    expect(testResult.start).lessThanOrEqual(after);
    expect(testResult.stop).greaterThanOrEqual(before);
    expect(testResult.stop).lessThanOrEqual(after);
    expect(testResult.start).lessThanOrEqual(testResult.stop!);
  });

  it("should process simple scenario with parameters", async () => {
    const results = await runFeatures(dataSet.stepArguments);

    expect(results.tests).length(1);

    const [testResult] = results.tests;
    expect(testResult.name).eq("plus operator");
  });

  it("should process tests with examples", async () => {
    const results = await runFeatures(dataSet.examples);

    expect(results.tests).length(2);

    const [first, second] = results.tests;
    expect(first.name).eq("Scenario with Positive Examples");
    expect(second.name).eq("Scenario with Positive Examples");
  });

  it("should process text attachments", async () => {
    const results = await runFeatures(dataSet.attachments);

    expect(results.tests).length(1);

    // const [testResult] = results.tests;
    // expect(testResult.at).eq("plus operator");
  });
});
