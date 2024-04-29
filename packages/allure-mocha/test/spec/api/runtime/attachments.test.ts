import { runMochaInlineTest } from "../../../utils";
import { beforeAll, describe, expect, it } from "vitest";
import { AllureResults } from "allure-js-commons/new/sdk/node";

describe("runtime attachmetns", async () => {
  let results: AllureResults;
  beforeAll(async () => {
    results = await runMochaInlineTest("attachments");
  });

  it("contains a test with a test-level attachment", async () => {
    const testAttachments = results.tests.find((t) => t.name === "test attachment")?.attachments;

    expect(testAttachments).toHaveLength(1);
    expect(testAttachments).toContainEqual(
      expect.objectContaining({name: "foo.txt", type: "text/plain"})
    );
    const source = testAttachments![0].source;
    const contentInBase64 = results.attachments[source] as string;
    const decodedContent = Buffer.from(contentInBase64, "base64").toString("utf8");
    expect(decodedContent).toEqual("bar");
  });

  it("contains a test with a step-level attachment", async () => {
    const stepAttachments = results.tests.find((t) => t.name === "step attachment")?.steps[0].attachments;

    expect(stepAttachments).toHaveLength(1);
    expect(stepAttachments).toContainEqual(
      expect.objectContaining({name: "foo.txt", type: "text/plain"})
    );
    const source = stepAttachments![0].source;
    const contentInBase64 = results.attachments[source] as string;
    const decodedContent = Buffer.from(contentInBase64, "base64").toString("utf8");
    expect(decodedContent).toEqual("bar");
  });
});
