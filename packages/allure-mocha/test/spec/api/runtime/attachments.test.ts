import { beforeAll, describe, expect, it } from "vitest";
import type { AllureResults } from "allure-js-commons/sdk";
import { runMochaInlineTest } from "../../../utils";

describe("test attachments", () => {
  let results: AllureResults;
  beforeAll(async () => {
    results = await runMochaInlineTest("testAttachment");
  });

  it("test may contain an attachment", () => {
    const testAttachments = results.tests.find((t) => t.name === "test attachment")?.attachments;

    expect(testAttachments).toHaveLength(1);
    expect(testAttachments).toContainEqual(expect.objectContaining({ name: "foo.txt", type: "text/plain" }));
    const source = testAttachments![0].source;
    const contentInBase64 = results.attachments[source] as string;
    const decodedContent = Buffer.from(contentInBase64, "base64").toString("utf8");
    expect(decodedContent).toEqual("bar");
  });
});
