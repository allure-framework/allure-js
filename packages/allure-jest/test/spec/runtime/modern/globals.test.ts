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
  expect(globalsEntries.length).toBeGreaterThan(0);
  globalsEntries.forEach(([globalsFileName]) => {
    expect(globalsFileName).toMatch(/.+-globals\.json/);
  });

  const allErrors = globalsEntries.flatMap(([, info]) => info.errors);
  const allAttachments = globalsEntries.flatMap(([, info]) => info.attachments);
  expect(allErrors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        message: "global setup failed",
        trace: "stack",
        timestamp: expect.any(Number),
      }),
    ]),
  );
  allErrors.forEach((error) => {
    expect(error.timestamp).toEqual(expect.any(Number));
  });
  allAttachments.forEach((attachment) => {
    expect(attachment.timestamp).toEqual(expect.any(Number));
  });
  expect(allErrors.filter((error) => error.message === "global setup failed")).toHaveLength(1);
  expect(allAttachments.filter((attachment) => attachment.name === "global-log")).toHaveLength(1);

  const globalAttachmentRef = allAttachments.find((a) => a.name === "global-log");
  expect(globalAttachmentRef).toBeDefined();
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
  expect(globalsEntries.length).toBeGreaterThan(0);

  const allErrors = globalsEntries.flatMap(([, info]) => info.errors);
  const allAttachments = globalsEntries.flatMap(([, info]) => info.attachments);
  expect(allErrors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        message: "setup-only error",
        trace: "setup stack",
        timestamp: expect.any(Number),
      }),
    ]),
  );
  allAttachments.forEach((attachment) => {
    expect(attachment.timestamp).toEqual(expect.any(Number));
  });

  const inlineRef = allAttachments.find((a) => a.name === "setup-inline-log");
  const pathRef = allAttachments.find((a) => a.name === "setup-file-log");

  expect(inlineRef?.type).toBe("text/plain");
  expect(pathRef?.type).toBe("text/plain");
  expect(Buffer.from(attachments[inlineRef!.source] as string, "base64").toString("utf-8")).toBe("from-inline");
  expect(Buffer.from(attachments[pathRef!.source] as string, "base64").toString("utf-8")).toBe("from-path");
});
