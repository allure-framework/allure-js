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

describe("CucumberJSAllureReporter > examples", () => {
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
