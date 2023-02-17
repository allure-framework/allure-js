import { expect } from "chai";
import { describe, it } from "mocha";
import { ITestFormatterOptions, runFeatures } from "../helpers/formatter_helpers";
import { buildSupportCodeLibrary } from "../helpers/runtime_helpers";

const dataSet: { [name: string]: ITestFormatterOptions } = {
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
};

describe("CucumberJSAllureReporter > examples", () => {
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
});
