import { LabelName, Status } from "allure-js-commons";
import { expect } from "chai";
import { ITestFormatterOptions, runFeatures } from "../helpers/formatter_helpers";
import { buildSupportCodeLibrary } from "../helpers/runtime_helpers";

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
      // according the documentation, world can't be used with arrow functions
      // https://github.com/cucumber/cucumber-js/blob/main/docs/faq.md#the-world-instance-isnt-available-in-my-hooks-or-step-definitions
      Given("a step", function () {
        this.attach("some text");
      });
    }),
    sources: [
      {
        data: ["Feature: attachments", "Scenario: add text attachment", "Given a step"].join("\n"),
        uri: "attachment.feature",
      },
    ],
  },
  dataTable: {
    supportCodeLibrary: buildSupportCodeLibrary(({ Given, When, Then }) => {
      Given(/^a table step$/, (_) => {});
      When(/^I add (\d+) to (\d+)$/, () => {});
      Then(/^result is (\d+)$/, (_) => {});
    }),
    sources: [
      {
        data:
          "Feature: Test Scenarios with Data table\n" +
          "\n" +
          "  Scenario Outline: Scenario with Positive Examples\n" +
          "    Given a table step\n" +
          "      | a | b | result |\n" +
          "      | 1 | 3 | 4      |\n" +
          "      | 2 | 4 | 6      |\n" +
          "    When I add <a> to <b>\n" +
          "    Then result is <result>\n",
        uri: "dataTable.feature",
      },
    ],
  },
  dataTableAndExamples: {
    supportCodeLibrary: buildSupportCodeLibrary(({ Given, When, Then }) => {
      Given(/^a table$/, (_) => {});
      When(/^I add (\d+) to (\d+)$/, () => {});
      Then(/^result is (\d+)$/, (_) => {});
    }),
    sources: [
      {
        data:
          "Feature: Test Scenarios with Data table and Examples\n" +
          "\n" +
          "  Scenario Outline: Scenario with Positive Examples\n" +
          "    Given a table\n" +
          "      | a |\n" +
          "      | 1 |\n" +
          "    When I add <a> to <b>\n" +
          "    Then result is <result>\n" +
          "    Examples:\n" +
          "      | b | result |\n" +
          "      | 3 | 4      |\n",
        uri: "dataTableAndExamples.feature",
      },
    ],
  },
  withTags: {
    supportCodeLibrary: buildSupportCodeLibrary(({ Given }) => {
      Given("a step", () => {});
    }),
    sources: [
      {
        data:
          "@foo\n" +
          "Feature: a\n" +
          "\n" +
          "  @bar\n" +
          "  Scenario: b\n" +
          "    Given a step\n" +
          "    When do something\n" +
          "    Then get something\n",
        uri: "withTags.feature",
      },
    ],
  },
};

describe("CucumberJSAllureReporter", () => {
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

    const attachmentsKeys = Object.keys(results.attachments);
    expect(attachmentsKeys).length(2);
    expect(results.attachments[attachmentsKeys[0]]).eq("a,b,result\n1,3,4\n2,4,6\n");
    expect(results.attachments[attachmentsKeys[1]]).eq("a,b,result\n1,3,4\n2,4,6\n");

    const [firstAttachment] = results.tests[0].attachments;
    expect(firstAttachment.type).eq("text/csv");
    expect(firstAttachment.source).eq(attachmentsKeys[0]);

    const [secondAttachment] = results.tests[1].attachments;
    expect(secondAttachment.type).eq("text/csv");
    expect(secondAttachment.source).eq(attachmentsKeys[1]);
  });

  it("should process text attachments", async () => {
    const results = await runFeatures(dataSet.attachments);
    expect(results.tests).length(1);

    const attachmentsKeys = Object.keys(results.attachments);
    expect(attachmentsKeys).length(1);
    expect(results.attachments[attachmentsKeys[0]]).eq("some text");

    const [attachment] = results.tests[0].attachments;
    expect(attachment.type).eq("text/plain");
    expect(attachment.source).eq(attachmentsKeys[0]);
  });

  it("should process data table as csv attachment", async () => {
    const results = await runFeatures(dataSet.dataTable);
    expect(results.tests).length(1);

    const attachmentsKeys = Object.keys(results.attachments);
    expect(attachmentsKeys).length(1);
    expect(results.attachments[attachmentsKeys[0]]).eq("a,b,result\n1,3,4\n2,4,6\n");

    const [attachment] = results.tests[0].attachments;
    expect(attachment.type).eq("text/csv");
    expect(attachment.source).eq(attachmentsKeys[0]);
  });

  it("should process data table and examples as csv attachment", async () => {
    const results = await runFeatures(dataSet.dataTableAndExamples);
    expect(results.tests).length(1);

    const attachmentsKeys = Object.keys(results.attachments);
    expect(attachmentsKeys).length(2);
    expect(results.attachments[attachmentsKeys[0]]).eq("a\n1\n");
    expect(results.attachments[attachmentsKeys[1]]).eq("b,result\n3,4\n");

    const [firstAttachment, secondAttachment] = results.tests[0].attachments;
    expect(firstAttachment.type).eq("text/csv");
    expect(firstAttachment.source).eq(attachmentsKeys[0]);
    expect(secondAttachment.type).eq("text/csv");
    expect(secondAttachment.source).eq(attachmentsKeys[1]);
  });

  it("should create labels", async () => {
    const results = await runFeatures(dataSet.withTags);
    expect(results.tests).length(1);

    const language = results.tests[0].labels.find((label) => label.name === LabelName.LANGUAGE);
    const framework = results.tests[0].labels.find((label) => label.name === LabelName.FRAMEWORK);
    const feature = results.tests[0].labels.find((label) => label.name === LabelName.FEATURE);
    const suite = results.tests[0].labels.find((label) => label.name === LabelName.SUITE);
    const tags = results.tests[0].labels.filter((label) => label.name === LabelName.TAG);

    expect(language?.value).eq("javascript");
    expect(framework?.value).eq("cucumberjs");
    expect(feature?.value).eq("a");
    expect(suite?.value).eq("b");
    expect(tags).length(2);
    expect(tags[0].value).eq("@foo");
    expect(tags[1].value).eq("@bar");
  });
});
