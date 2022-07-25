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
      Given("add an image", function () {
        // example base64 encoded image for testing.
        // Image is public domain cucumber - https://www.publicdomainpictures.net/en/view-image.php?image=15571&picture=cucumber-vegetable
        const base64Image = "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';
        const decodedImage = Buffer.from(base64Image, "base64");
        this.attach(decodedImage, "image/png");
      });
    }),
    sources: [
      {
        data: ["Feature: attachments", "Scenario: add text attachment", "Given a step"].join("\n"),
        uri: "attachment.feature",
      },
      {
        data: ["Feature: image attachments", "Scenario: add image attachment", "Given add an image"].join("\n"),
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
  withLinks: {
    supportCodeLibrary: buildSupportCodeLibrary(({ Given }) => {
      Given("a step", () => {});
    }),
    sources: [
      {
        data:
          "@foo\n" +
          "Feature: a\n" +
          "\n" +
          "  @issue=1 @tms=2\n" +
          "  Scenario: b\n" +
          "    Given a step\n" +
          "    When do something\n" +
          "    Then get something\n",
        uri: "withIssueLink.feature",
      },
    ],
  },
  withLabels: {
    supportCodeLibrary: buildSupportCodeLibrary(({ Given }) => {
      Given("a step", () => {});
    }),
    sources: [
      {
        data:
          "Feature: a\n" +
          "\n" +
          "  @severity:bar @feature:foo @foo\n" +
          "  Scenario: b\n" +
          "    Given a step\n" +
          "    When do something\n" +
          "    Then get something\n",
        uri: "withIssueLink.feature",
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
    expect(results.tests).length(2);

    const attachmentsKeys = Object.keys(results.attachments);
    expect(attachmentsKeys).length(2);
    expect(results.attachments[attachmentsKeys[0]]).eq("some text");

    const [attachment] = results.tests[0].attachments;
    expect(attachment.type).eq("text/plain");
    expect(attachment.source).eq(attachmentsKeys[0]);
  });

  it("should process image attachments", async () => {
    const results = await runFeatures(dataSet.attachments);
    expect(results.tests).length(2);

    const attachmentsKeys = Object.keys(results.attachments);
    expect(attachmentsKeys).length(2);

    const [imageAttachment] = results.tests[1].attachments;
    expect(imageAttachment.type).eq("image/png");
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

  it("should add links", async () => {
    const results = await runFeatures(dataSet.withLinks, {
      links: [
        {
          pattern: [/@issue=(.*)/],
          urlTemplate: "https://example.org/issues/%s",
          type: "issue",
        },
        {
          pattern: [/@tms=(.*)/],
          urlTemplate: "https://example.org/tasks/%s",
          type: "tms",
        },
      ],
    });
    expect(results.tests).length(1);

    const { links, labels } = results.tests[0];
    expect(links).length(2);
    expect(links[0].type).eq("issue");
    expect(links[0].url).eq("https://example.org/issues/1");
    expect(links[1].type).eq("tms");
    expect(links[1].url).eq("https://example.org/tasks/2");

    const tags = results.tests[0].labels.filter((label) => label.name === LabelName.TAG);
    expect(tags).length(1);
  });

  it("should add labels", async () => {
    const results = await runFeatures(dataSet.withLabels, {
      labels: [
        {
          pattern: [/@feature:(.*)/],
          name: "epic",
        },
        {
          pattern: [/@severity:(.*)/],
          name: "severity",
        },
      ],
    });
    expect(results.tests).length(1);

    const { labels } = results.tests[0];
    const epic = labels.find((label) => label.name === LabelName.EPIC);
    const severity = labels.find((label) => label.name === LabelName.SEVERITY);
    const tags = labels.filter((label) => label.name === LabelName.TAG);
    expect(epic?.value).eq("foo");
    expect(severity?.value).eq("bar");
    expect(tags).length(1);
  });
});
