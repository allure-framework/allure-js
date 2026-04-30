import { describe, expect } from "vitest";

import { runBunInlineTest } from "../../utils.js";
import { bunIt, readAttachment } from "../helpers.js";

describe("globals", () => {
  bunIt("writes globals from rootless runtime API calls", async () => {
    const { globals, attachments, exitCode } = await runBunInlineTest({
      "payload.txt": "from path",
      "sample.test.ts": `
        import { test } from "bun:test";
        import { globalAttachment, globalAttachmentPath, globalError } from "allure-js-commons";

        await globalAttachment("rootless inline", "inline", { contentType: "text/plain" });
        await globalAttachmentPath("rootless path", "./payload.txt", { contentType: "text/plain" });
        await globalError({ message: "rootless problem", trace: "rootless stack" });

        test("passes", () => {});
      `,
    });

    expect(exitCode).toBe(0);

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
          message: "rootless problem",
          trace: "rootless stack",
          timestamp: expect.any(Number),
        }),
      ]),
    );
    expect(allAttachments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "rootless inline", type: "text/plain", timestamp: expect.any(Number) }),
        expect.objectContaining({ name: "rootless path", type: "text/plain", timestamp: expect.any(Number) }),
      ]),
    );

    const inlineAttachment = allAttachments.find((attachment) => attachment.name === "rootless inline");
    const pathAttachment = allAttachments.find((attachment) => attachment.name === "rootless path");

    expect(inlineAttachment).toBeDefined();
    expect(pathAttachment).toBeDefined();
    expect(readAttachment(attachments, inlineAttachment!.source)).toBe("inline");
    expect(readAttachment(attachments, pathAttachment!.source)).toBe("from path");
  });

  bunIt("writes globals from fixture runtime API calls", async () => {
    const { globals, attachments, exitCode } = await runBunInlineTest({
      "sample.test.ts": `
        import { beforeAll, test } from "bun:test";
        import { globalAttachment, globalError } from "allure-js-commons";

        beforeAll(async () => {
          await globalAttachment("fixture inline", "fixture", { contentType: "text/plain" });
          await globalError({ message: "fixture problem", trace: "fixture stack" });
        });

        test("passes", () => {});
      `,
    });

    expect(exitCode).toBe(0);

    const globalsEntries = Object.entries(globals ?? {});
    const allErrors = globalsEntries.flatMap(([, info]) => info.errors);
    const allAttachments = globalsEntries.flatMap(([, info]) => info.attachments);
    const fixtureAttachment = allAttachments.find((attachment) => attachment.name === "fixture inline");

    expect(allErrors).toEqual(
      expect.arrayContaining([expect.objectContaining({ message: "fixture problem", trace: "fixture stack" })]),
    );
    expect(fixtureAttachment).toBeDefined();
    expect(readAttachment(attachments, fixtureAttachment!.source)).toBe("fixture");
  });
});
