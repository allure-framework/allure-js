import { LabelName } from "allure-js-commons";
import { expect } from "chai";
import { describe, it } from "mocha";
import { ITestFormatterOptions, runFeatures } from "../helpers/formatter_helpers";
import { buildSupportCodeLibrary } from "../helpers/runtime_helpers";

const dataSet: { [name: string]: ITestFormatterOptions } = {
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
};

describe("CucumberJSAllureReporter > examples", () => {
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

      const { links } = results.tests[0];

      expect(links).length(2);
      expect(links[0].type).eq("issue");
      expect(links[0].url).eq("https://example.org/issues/1");
      expect(links[1].type).eq("tms");
      expect(links[1].url).eq("https://example.org/tasks/2");

      const tags = results.tests[0].labels.filter((label) => label.name === LabelName.TAG);
      expect(tags).length(1);
    });
});
