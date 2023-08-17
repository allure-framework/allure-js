import { LabelName } from "allure-js-commons";
import { expect } from "chai";
import { describe, it } from "mocha";
import { ITestFormatterOptions, runFeatures } from "../helpers/formatter_helpers";
import { buildSupportCodeLibrary } from "../helpers/runtime_helpers";

const dataSet: { [name: string]: ITestFormatterOptions } = {
  withLabels: {
    supportCodeLibrary: buildSupportCodeLibrary(({ Given }) => {
      Given("a step", () => {});
    }),
    sources: [
      {
        data:
          "@severity:foo @feature:qux\n" +
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
  withLabelsAndRules: {
    supportCodeLibrary: buildSupportCodeLibrary(({ Given }) => {
      Given("a step", () => {});
    }),
    sources: [
      {
        data:
          "@severity:foo @feature:bar\n" +
          "Feature: a\n" +
          "\n" +
          "  Rule: r\n" +
          "\n" +
          "    @severity:bar @feature:foo @foo\n" +
          "    Scenario: b\n" +
          "      Given a step\n" +
          "      When do something\n" +
          "      Then get something\n",
        uri: "withIssueLink.feature",
      },
    ],
  },
};

describe("CucumberJSAllureReporter > examples", () => {
  it("should add labels", async () => {
    const results = await runFeatures(dataSet.withLabels, {
      labels: [
        {
          pattern: [/@feature:(.*)/],
          name: "feature",
        },
        {
          pattern: [/@severity:(.*)/],
          name: "severity",
        },
      ],
    });
    expect(results.tests).length(1);

    const { labels } = results.tests[0];
    const tags = labels.filter((label) => label.name === LabelName.TAG);
    const severityLabels = labels
      .filter((label) => label.name === LabelName.SEVERITY)
      .map(({ value }) => value);
    const featureLabels = labels
      .filter((label) => label.name === LabelName.FEATURE)
      .map(({ value }) => value);

    expect(tags).length(1);
    expect(severityLabels).contains("foo");
    expect(severityLabels).contains("bar");
    expect(featureLabels).contains("foo");
    expect(featureLabels).contains("bar");
  });

  it("should add labels when scenario is inside a rule", async () => {
    const results = await runFeatures(dataSet.withLabelsAndRules, {
      labels: [
        {
          pattern: [/@feature:(.*)/],
          name: "feature",
        },
        {
          pattern: [/@severity:(.*)/],
          name: "severity",
        },
      ],
    });
    expect(results.tests).length(1);

    const { labels } = results.tests[0];
    const tags = labels.filter((label) => label.name === LabelName.TAG);
    const severityLabels = labels
      .filter((label) => label.name === LabelName.SEVERITY)
      .map(({ value }) => value);
    const featureLabels = labels
      .filter((label) => label.name === LabelName.FEATURE)
      .map(({ value }) => value);

    expect(tags).length(1);
    expect(severityLabels).contains("foo");
    expect(severityLabels).contains("bar");
    expect(featureLabels).contains("foo");
    expect(featureLabels).contains("bar");
  });
});
