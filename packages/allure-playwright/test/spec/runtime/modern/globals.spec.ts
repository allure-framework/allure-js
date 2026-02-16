import { expect, it } from "vitest";
import { runPlaywrightInlineTest } from "../../../utils.js";

it("writes globals payload from runtime API calls", async () => {
  const { globals, attachments } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import test from '@playwright/test';
      import { globalAttachment, globalError } from 'allure-js-commons';

      test("passes", async () => {
        await globalAttachment("global-log", "hello", { contentType: "text/plain" });
        await globalError({ message: "global setup failed", trace: "stack" });
      });
    `,
  });

  const globalsEntries = Object.entries(globals ?? {});
  expect(globalsEntries).toHaveLength(1);

  const [globalsFileName, globalInfo] = globalsEntries[0];
  expect(globalsFileName).toMatch(/.+-globals\.json/);
  expect(globalInfo.errors).toEqual([
    {
      message: "global setup failed",
      trace: "stack",
    },
  ]);
  expect(globalInfo.attachments).toHaveLength(1);

  const [globalAttachmentRef] = globalInfo.attachments;
  expect(globalAttachmentRef.name).toBe("global-log");
  expect(globalAttachmentRef.type).toBe("text/plain");

  const encodedAttachment = attachments[globalAttachmentRef.source] as string;
  expect(Buffer.from(encodedAttachment, "base64").toString("utf-8")).toBe("hello");
});
