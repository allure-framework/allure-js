import { expect } from "chai";
import { describe, it } from "mocha";
import { LaunchSummary, runCucumberTests } from "../utils";

describe("attachments", () => {
  let summary: LaunchSummary;

  before(async () => {
    summary = await runCucumberTests(["attachments"]);
  });

  it("adds text attachments", () => {
    const result = summary.results["add text attachment"];
    const [stepAttachment] = result.steps[0].attachments;
    const attachment = summary.attachments[stepAttachment.source];

    expect(stepAttachment.name).eq("attachment");
    expect(stepAttachment.type).eq("text/plain");
    expect(attachment.content).eq("some text");
  });

  it("adds image attachments", () => {
    const result = summary.results["add image attachment"];
    const [stepAttachment] = result.steps[0].attachments;
    const attachment = summary.attachments[stepAttachment.source];

    expect(stepAttachment.name).eq("attachment");
    expect(stepAttachment.type).eq("image/png");
    expect(attachment.content.length).not.eq(0);
  });
});
