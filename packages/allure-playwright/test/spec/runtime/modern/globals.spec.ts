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

it("does not collect globals from setup-only file without tests", async () => {
  const { globals } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { writeFileSync } from "node:fs";
      import { join } from "node:path";
      import { globalAttachment, globalAttachmentPath, globalError } from "allure-js-commons";

      const filePath = join(process.cwd(), "setup-only.log");
      writeFileSync(filePath, "from-path", "utf8");

      void globalAttachment("setup-inline-log", "from-inline", { contentType: "text/plain" });
      void globalAttachmentPath("setup-file-log", filePath, { contentType: "text/plain" });
      void globalError({ message: "setup-only error", trace: "setup stack" });
    `,
  });

  expect(Object.keys(globals ?? {})).toHaveLength(0);
});
