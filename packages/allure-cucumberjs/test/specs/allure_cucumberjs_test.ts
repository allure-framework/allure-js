import os from "os";
import process from "process";
import { LabelName, md5, Status } from "allure-js-commons";
import { it, describe } from "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { ITestFormatterOptions, runFeatures } from "../helpers/formatter_helpers";
import { buildSupportCodeLibrary } from "../helpers/runtime_helpers";
import { CucumberAllureWorld } from "../../src/CucumberAllureWorld";

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
        // single pixel #007 image
        const base64Image =
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdjYGAo/w8AAfIBdzDXaSAAAAAASUVORK5CYII=";
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
        data: [
          "Feature: image attachments",
          "Scenario: add image attachment",
          "Given add an image",
        ].join("\n"),
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
  withStepsAnonymous: {
    supportCodeLibrary: buildSupportCodeLibrary(({ Given, When, Then }) => {
      Given("a step", function () {});

      When("do something", async function (this: CucumberAllureWorld) {
        await this.step("first nested step", async function () {
          await this.label("label_name", "label_value");
        });
      });

      Then("get something", async function (this: CucumberAllureWorld) {
        await this.step("second nested step", async function () {
          await this.epic("foo");
          await this.attach(JSON.stringify({ foo: "bar" }), "application/json");
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
  withStepsArrow: {
    supportCodeLibrary: buildSupportCodeLibrary(({ Given, When, Then, setWorldConstructor }) => {
      Given("a step", function () {});

      When("do something", async function (this: CucumberAllureWorld) {
        await this.step("first nested step", async (step) => {
          await step.label("label_name", "label_value");
        });
      });

      Then("get something", async function (this: CucumberAllureWorld) {
        await this.step("second nested step", async (step) => {
          await this.epic("foo");
          await step.attach(JSON.stringify({ foo: "bar" }), "application/json");
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
  withFailedStep: {
    supportCodeLibrary: buildSupportCodeLibrary(({ Given, When, Then, setWorldConstructor }) => {
      Given("a step", function () {});

      When("do something", async function (this: CucumberAllureWorld) {
        await this.step("first nested step", async (step) => {
          throw new Error("an error message");
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
          "    When do something\n",
        uri: "withNestedAnonymous.feature",
      },
    ],
  },
  withCustomWorldConstructor: {
    supportCodeLibrary: buildSupportCodeLibrary(({ Given, When, Then, setWorldConstructor }) => {
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

describe("CucumberJSAllureReporter", () => {
  describe("basic functionality", () => {
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

    it("should process data table as csv step attachment", async () => {
      const results = await runFeatures(dataSet.dataTable);
      expect(results.tests).length(1);

      const attachmentsKeys = Object.keys(results.attachments);
      expect(attachmentsKeys).length(1);
      expect(results.attachments[attachmentsKeys[0]]).eq("a,b,result\n1,3,4\n2,4,6\n");

      const [attachment] = results.tests[0].steps[0].attachments;
      expect(attachment.type).eq("text/csv");
      expect(attachment.source).eq(attachmentsKeys[0]);
    });

    it("should process data table and examples as csv attachment", async () => {
      const results = await runFeatures(dataSet.dataTableAndExamples);
      expect(results.tests).length(1);

      const attachmentsKeys = Object.keys(results.attachments);
      expect(attachmentsKeys).length(2);
      const dataTableAttachment = results.tests[0].steps[0].attachments[0];
      const exampleAttachment = results.tests[0].attachments[0];

      expect(exampleAttachment.type).eq("text/csv");
      expect(exampleAttachment.source).eq(attachmentsKeys[0]);
      expect(dataTableAttachment.type).eq("text/csv");
      expect(dataTableAttachment.source).eq(attachmentsKeys[1]);

      expect(results.attachments[attachmentsKeys[0]]).eq("b,result\n3,4\n");
      expect(results.attachments[attachmentsKeys[1]]).eq("a\n1\n");
    });

    it("should create labels", async () => {
      sinon.stub(os, "hostname").returns("127.0.0.1");
      sinon.stub(process, "getuid").returns(123);

      const results = await runFeatures(dataSet.withTags);
      expect(results.tests).length(1);

      const language = results.tests[0].labels.find((label) => label.name === LabelName.LANGUAGE);
      const framework = results.tests[0].labels.find((label) => label.name === LabelName.FRAMEWORK);
      const feature = results.tests[0].labels.find((label) => label.name === LabelName.FEATURE);
      const suite = results.tests[0].labels.find((label) => label.name === LabelName.SUITE);
      const host = results.tests[0].labels.find((label) => label.name === LabelName.HOST);
      const thread = results.tests[0].labels.find((label) => label.name === LabelName.THREAD);
      const tags = results.tests[0].labels.filter((label) => label.name === LabelName.TAG);

      expect(language?.value).eq("javascript");
      expect(framework?.value).eq("cucumberjs");
      expect(feature?.value).eq("a");
      expect(suite?.value).eq("b");
      expect(host?.value).eq("127.0.0.1");
      expect(thread?.value).eq(process.pid.toString());
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

    it("should set fullName, testCaseId and historyId", async () => {
      const results = await runFeatures(dataSet.simple);

      expect(results.tests).length(1);
      const [testResult] = results.tests;
      const source = dataSet.simple.sources?.[0];

      const name = source!.data.match(/\nScenario: (.+)\n/)?.[1];
      const fullName = `${source!.uri}#${name!}`;
      expect(testResult.fullName).eq(fullName);
      expect(testResult.testCaseId).eq(md5(fullName));
      expect(testResult.historyId).eq(testResult.testCaseId);
    });
  });

  describe("world", () => {
    it("should handle steps with anonymous handler function", async () => {
      const results = await runFeatures(dataSet.withStepsAnonymous);
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
      const results = await runFeatures(dataSet.withStepsAnonymous);
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

    it("should handle errors inside steps", async () => {
      const results = await runFeatures(dataSet.withFailedStep);
      expect(results.tests).length(1);

      const {
        steps: [, whenStep],
      } = results.tests[0];

      expect(whenStep.steps[0].status).eq(Status.FAILED);
      expect(whenStep.steps[0].statusDetails.message).eq("an error message");
      expect(whenStep.steps[0].statusDetails.trace).not.eq("");
    });

    it("should applied custom world constructor", async () => {
      const results = await runFeatures(dataSet.withCustomWorldConstructor);
      expect(results.tests).length(1);
      expect(results.tests[0].statusDetails.message).undefined;
      expect(results.tests[0].status).eq(Status.PASSED);
    });
  });
});
