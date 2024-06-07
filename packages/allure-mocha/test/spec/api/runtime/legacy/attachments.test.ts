import { beforeAll, describe, expect, it } from "vitest";
import type { TestResult } from "allure-js-commons";
import type { AllureResults } from "allure-js-commons/sdk";
import { runMochaInlineTest } from "../../../../utils.js";

describe("legacy test attachments API", () => {
  let results: AllureResults;
  beforeAll(async () => {
    results = await runMochaInlineTest(["legacy", "testAttachment"], ["legacy", "testAttachmentFromStep"]);
  });

  it("test may contain an attachment", () => {
    const testResult = results.tests.find((t: TestResult) => t.name === "test attachment")!;
    const [step] = testResult.steps;

    expect(step.name).toBe("foo.txt");
    const [attachment] = step.attachments;
    expect(attachment.name).toBe("foo.txt");
    expect(attachment.type).toBe("text/plain");

    const source = attachment.source;
    const contentInBase64 = results.attachments[source] as string;
    const decodedContent = Buffer.from(contentInBase64, "base64").toString("utf8");
    expect(decodedContent).toEqual("bar");
  });
});
