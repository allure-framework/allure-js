import { expect, it } from "vitest";
import { runJestInlineTest } from "../../../utils.js";

it("writes globals payload from runtime API calls", async () => {
  const { globals, attachments } = await runJestInlineTest({
    "sample.test.js": `
      const { globalAttachment, globalError } = require("allure-js-commons");

      beforeAll(async () => {
        await globalAttachment("global-log", "hello", { contentType: "text/plain" });
        await globalError({ message: "global setup failed", trace: "stack" });
      });

      it("passes", () => {
        expect(1).toBe(1);
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

it("collects globals from setup-only file without tests", async () => {
  const { globals, attachments } = await runJestInlineTest({
    "sample.test.js": `
      const { writeFileSync } = require("node:fs");
      const { join } = require("node:path");
      const { globalAttachment, globalAttachmentPath, globalError } = require("allure-js-commons");

      const filePath = join(process.cwd(), "setup-only.log");
      writeFileSync(filePath, "from-path", "utf8");

      void globalAttachment("setup-inline-log", "from-inline", { contentType: "text/plain" });
      void globalAttachmentPath("setup-file-log", filePath, { contentType: "text/plain" });
      void globalError({ message: "setup-only error", trace: "setup stack" });
    `,
  });

  const globalsEntries = Object.entries(globals ?? {});
  expect(globalsEntries).toHaveLength(1);

  const [, globalInfo] = globalsEntries[0];
  expect(globalInfo.errors).toEqual(
    expect.arrayContaining([
      {
        message: "setup-only error",
        trace: "setup stack",
      },
    ]),
  );

  const inlineRef = globalInfo.attachments.find((a) => a.name === "setup-inline-log");
  const pathRef = globalInfo.attachments.find((a) => a.name === "setup-file-log");

  expect(inlineRef?.type).toBe("text/plain");
  expect(pathRef?.type).toBe("text/plain");
  expect(Buffer.from(attachments[inlineRef!.source] as string, "base64").toString("utf-8")).toBe("from-inline");
  expect(Buffer.from(attachments[pathRef!.source] as string, "base64").toString("utf-8")).toBe("from-path");
});
