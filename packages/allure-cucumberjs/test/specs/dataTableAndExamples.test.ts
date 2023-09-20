import { expect } from "chai";
import { before, describe, it } from "mocha";
import { LaunchSummary, runCucumberTests } from "../utils";

describe("dataTableAndExamples", () => {
  let summary: LaunchSummary;

  before(async () => {
    summary = await runCucumberTests(["dataTableAndExamples"]);
  });

  it("adds example as csv attachment to the test", () => {
    const result = summary.results["scenario with positive examples"];
    const [testAttachment] = result.attachments;
    const attachment = summary.attachments[testAttachment.source];

    expect(testAttachment.name).eq("Examples");
    expect(testAttachment.type).eq("text/csv");
    expect(attachment.content).eq("b,result\n3,4\n");
  });

  it("adds data table as csv attachment to the related step", () => {
    const result = summary.results["scenario with positive examples"];
    const [stepAttachment] = result.steps[0].attachments;
    const attachment = summary.attachments[stepAttachment.source];

    expect(stepAttachment.name).eq("Data table");
    expect(stepAttachment.type).eq("text/csv");
    expect(attachment.content).eq("a\n1\n");
  });
});
