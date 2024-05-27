import { beforeAll, describe, expect, it } from "vitest";
import { AllureResults } from "allure-js-commons/sdk/node";
import { runMochaInlineTest } from "../../../../utils";

describe("legacy test attachments API", () => {
  let results: AllureResults;
  beforeAll(async () => {
    results = await runMochaInlineTest(["legacy", "testAttachment"], ["legacy", "testAttachmentFromStep"]);
  });

  describe("attachment is called from a test", () => {
    it("the test without steps contains an attachment", () => {
      const testAttachments = results.tests.find((t) => t.name === "test attachment")?.attachments;

      expect(testAttachments).toHaveLength(1);
      expect(testAttachments).toContainEqual(expect.objectContaining({ name: "foo.txt", type: "text/plain" }));
      const source = testAttachments![0].source;
      const contentInBase64 = results.attachments[source] as string;
      const decodedContent = Buffer.from(contentInBase64, "base64").toString("utf8");
      expect(decodedContent).toEqual("bar");
    });
  });

  describe("testAttachment is called from a step", () => {
    it("The file is attached to the test", () => {
      const test = results.tests.find((t) => t.name === "testAttachment from a step");
      const testAttachments = test?.attachments;

      expect(testAttachments).toHaveLength(1);
      expect(testAttachments).toContainEqual(expect.objectContaining({ name: "bar.txt", type: "text/plain" }));
      const source = testAttachments![0].source;
      const contentInBase64 = results.attachments[source] as string;
      const decodedContent = Buffer.from(contentInBase64, "base64").toString("utf8");
      expect(decodedContent).toEqual("baz");

      expect(test?.steps[0]?.attachments).toHaveLength(0);
    });
  });
});
