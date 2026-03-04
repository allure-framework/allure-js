import { describe, expect, it } from "vitest";
import { createVitestBrowserConfig, createVitestConfig, runVitestInlineTest } from "../../../utils.js";

describe("globals", () => {
  describe('for "node"', () => {
    it("writes globals payload from runtime API calls", async () => {
      const { globals, attachments } = await runVitestInlineTest({
        "vitest.config.ts": ({ allureResultsPath }) => createVitestConfig(allureResultsPath),
        "sample.test.ts": `
      import { beforeAll, test } from "vitest";
      import { globalAttachment, globalError } from "allure-js-commons";

      beforeAll(async () => {
        await globalAttachment("global-log", Buffer.from("hello"), { contentType: "text/plain" });
        await globalError({ message: "global setup failed", trace: "stack" });
      });

      test("passes 1", () => {});
      test("passes 2", () => {});
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
      expect(globalAttachmentRef!.name).toBe("global-log");
      expect(globalAttachmentRef!.type).toBe("text/plain");

      const encodedAttachment = attachments[globalAttachmentRef!.source] as string;

      expect(Buffer.from(encodedAttachment, "base64").toString("utf-8")).toBe("hello");
    });

    it("does not collect globals from setup-only file without tests", async () => {
      const { globals } = await runVitestInlineTest({
        "vitest.config.ts": ({ allureResultsPath }) => createVitestConfig(allureResultsPath),
        "sample.test.ts": `
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
  });

  describe('for "browser"', () => {
    it("writes globals payload from runtime API calls", async () => {
      const { globals, attachments } = await runVitestInlineTest({
        "vitest.config.ts": ({ allureResultsPath }) => createVitestBrowserConfig(allureResultsPath),
        "sample.test.ts": `
      import { beforeAll, test } from "vitest";
      import { globalAttachment, globalError } from "allure-js-commons";

      beforeAll(async () => {
        await globalAttachment("global-log", new TextEncoder().encode("hello"), { contentType: "text/plain" });
        await globalError({ message: "global setup failed", trace: "stack" });
      });

      test("passes 1", () => {});
      test("passes 2", () => {});
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
      expect(globalAttachmentRef!.name).toBe("global-log");
      expect(globalAttachmentRef!.type).toBe("text/plain");

      const encodedAttachment = attachments[globalAttachmentRef!.source] as string;

      expect(Buffer.from(encodedAttachment, "base64").toString("utf-8")).toBe("hello");
    });
  });
});
