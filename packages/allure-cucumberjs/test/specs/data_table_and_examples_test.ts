import { expect } from "chai";
import { describe, it } from "mocha";
import { ITestFormatterOptions, runFeatures } from "../helpers/formatter_helpers";
import { buildSupportCodeLibrary } from "../helpers/runtime_helpers";

const dataSet: { [name: string]: ITestFormatterOptions } = {
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
};

describe("CucumberJSAllureReporter > examples", () => {
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
});
