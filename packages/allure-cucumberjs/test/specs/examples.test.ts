import { expect } from "chai";
import { before, describe, it } from "mocha";
import { LaunchSummary, runCucumberTests } from "../utils";

describe("examples", () => {
  let summary: LaunchSummary;

  before(async () => {
    summary = await runCucumberTests(["examples"]);
  });

  it("adds examples table as csv attachment to the test", async () => {
    const result = summary.results["scenario with positive examples"];
    const [testAttachment] = result.attachments;
    const attachment = summary.attachments[testAttachment.source];

    expect(testAttachment.name).eq("Examples");
    expect(testAttachment.type).eq("text/csv");
    expect(attachment.content).eq("a,b,result\n1,3,4\n2,4,6\n");
  });
});
