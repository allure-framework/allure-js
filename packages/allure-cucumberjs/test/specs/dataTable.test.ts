import { expect } from "chai";
import { before, describe, it } from "mocha";
import { LaunchSummary, runCucumberTests } from "../utils";

describe("dataTable", () => {
  let summary: LaunchSummary;

  before(async () => {
    summary = await runCucumberTests(["dataTable"]);
  });

  it("adds data table as csv attachment to the related step", () => {
    const result = summary.results["scenario with positive examples"];
    const [stepAttachment] = result.steps[0].attachments;
    const attachment = summary.attachments[stepAttachment.source];

    expect(stepAttachment.name).eq("Data table");
    expect(stepAttachment.type).eq("text/csv");
    expect(attachment.content).eq("a,b,result\n1,3,4\n2,4,6\n");
  });
});
