import { expect, it } from "vitest";

import { runCucumberInlineTest } from "../../../utils.js";

it("writes globals payload from sync runtime hooks", async () => {
  const { globals, attachments } = await runCucumberInlineTest(["hooks"], ["hooks", "runtime/sync/globals"], {
    parallel: false,
  });

  const globalsEntries = Object.entries(globals ?? {});
  expect(globalsEntries.length).toBeGreaterThan(0);

  const allErrors = globalsEntries.flatMap(([, info]) => info.errors);
  const allAttachments = globalsEntries.flatMap(([, info]) => info.attachments);
  expect(allErrors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        message: "after hook error",
      }),
    ]),
  );

  const beforeAttachmentRef = allAttachments.find((attachment) => attachment.name === "before-log");
  expect(beforeAttachmentRef?.type).toBe("text/plain");
  expect(Buffer.from(attachments[beforeAttachmentRef!.source] as string, "base64").toString("utf-8")).toBe(
    "before",
  );
});
