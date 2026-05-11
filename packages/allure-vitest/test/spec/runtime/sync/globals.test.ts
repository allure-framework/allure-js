import { describe, expect, it } from "vitest";

import { createVitestConfig, runVitestInlineTest } from "../../../utils.js";

describe("sync globals", () => {
  describe('for "node"', () => {
    it("writes globals payload from sync runtime API calls", async () => {
      const { globals, attachments } = await runVitestInlineTest({
        "vitest.config.ts": ({ allureResultsPath }) => createVitestConfig(allureResultsPath),
        "sample.test.ts": `
          import { beforeAll, test } from "vitest";
          import { globalAttachment, globalError } from "allure-js-commons/sync";

          beforeAll(() => {
            globalAttachment("global-log", Buffer.from("hello"), { contentType: "text/plain" });
            globalError({ message: "global setup failed", trace: "stack" });
          });

          test("passes", () => {});
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
      const globalAttachmentRef = allAttachments.find((attachment) => attachment.name === "global-log");
      expect(globalAttachmentRef?.type).toBe("text/plain");
      expect(Buffer.from(attachments[globalAttachmentRef!.source] as string, "base64").toString("utf-8")).toBe("hello");
    });
  });
});
