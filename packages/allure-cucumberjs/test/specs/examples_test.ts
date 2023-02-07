import { expect } from "chai";
import { describe, it } from "mocha";
import { ITestFormatterOptions, runFeatures } from "../helpers/formatter_helpers";
import { buildSupportCodeLibrary } from "../helpers/runtime_helpers";

const dataSet: { [name: string]: ITestFormatterOptions } = {
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
};

describe("CucumberJSAllureReporter > examples", () => {
  it("processs tests with examples", async () => {
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
});
