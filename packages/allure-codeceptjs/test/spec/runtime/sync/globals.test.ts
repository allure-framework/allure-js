import { expect, it } from "vitest";

import { runCodeceptJsInlineTest } from "../../../utils.js";

it("writes globals payload from sync runtime API calls", async () => {
  const { globals, attachments } = await runCodeceptJsInlineTest({
    "sample.test.js": `
      const { globalAttachment, globalError } = require("allure-js-commons/sync");

      Feature("sync-feature");
      BeforeSuite(() => {
        globalAttachment("before-suite-log", "before", { contentType: "text/plain" });
      });

      Scenario("sync-scenario", () => {
        globalError({ message: "global setup failed", trace: "stack" });
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

  const globalAttachmentRef = allAttachments.find((attachment) => attachment.name === "before-suite-log");
  expect(globalAttachmentRef?.type).toBe("text/plain");
  expect(Buffer.from(attachments[globalAttachmentRef!.source] as string, "base64").toString("utf-8")).toBe("before");
});
