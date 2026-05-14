import { expect, it } from "vitest";

import { runJestInlineTest } from "../../../utils.js";

it("writes globals payload from sync runtime API calls", async () => {
  const { globals, attachments } = await runJestInlineTest({
    "sample.test.js": `
      const { globalAttachment, globalError } = require("allure-js-commons/sync");

      beforeAll(() => {
        globalAttachment("global-log", "hello", { contentType: "text/plain" });
        globalError({ message: "global setup failed", trace: "stack" });
      });

      it("passes", () => {
        expect(1).toBe(1);
      });
    `,
  });

  const globalsEntries = Object.entries(globals ?? {});
  expect(globalsEntries.length).toBeGreaterThan(0);

  const allErrors = globalsEntries.flatMap(([, info]) => info.errors);
  const allAttachments = globalsEntries.flatMap(([, info]) => info.attachments);
  expect(allErrors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        message: "global setup failed",
        trace: "stack",
      }),
    ]),
  );
  expect(allAttachments).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "global-log",
        type: "text/plain",
      }),
    ]),
  );

  const globalAttachmentRef = allAttachments.find((attachment) => attachment.name === "global-log");
  expect(globalAttachmentRef).toBeDefined();
  expect(Buffer.from(attachments[globalAttachmentRef!.source] as string, "base64").toString("utf-8")).toBe("hello");
});
