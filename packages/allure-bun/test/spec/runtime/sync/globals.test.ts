import { describe, expect, it } from "vitest";

import { runBunInlineTest } from "../../../utils.js";
import { getTestByName, readAttachment } from "../../helpers.js";

describe("sync globals", () => {
  it("writes globals from rootless sync runtime API calls", async () => {
    const { globals, attachments, exitCode } = await runBunInlineTest({
      "payload.txt": "from path",
      "sample.test.ts": `
        import { test } from "bun:test";
        import { globalAttachment, globalAttachmentPath, globalError } from "allure-js-commons/sync";

        globalAttachment("rootless inline", "inline", { contentType: "text/plain" });
        globalAttachmentPath("rootless path", "./payload.txt", { contentType: "text/plain" });
        globalError({ message: "rootless problem", trace: "rootless stack" });

        test("passes", () => {});
      `,
    });

    expect(exitCode).toBe(0);

    const globalsEntries = Object.entries(globals ?? {});
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

  it("adds sync metadata from before fixtures to linked tests", async () => {
    const { tests, exitCode } = await runBunInlineTest({
      "sample.test.ts": `
        import { beforeAll, test } from "bun:test";
        import { label } from "allure-js-commons/sync";

        beforeAll(() => {
          label("fromBeforeAll", "yes");
        });

        test("with fixture label", () => {});
      `,
    });

    expect(exitCode).toBe(0);
    expect(getTestByName(tests, "with fixture label").labels).toContainEqual({
      name: "fromBeforeAll",
      value: "yes",
    });
  });
});
