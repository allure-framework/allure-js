import { expect, it } from "vitest";

import { runCucumberInlineTest } from "../../../utils.js";

it("writes globals payload from runtime API calls", async () => {
  const { globals, attachments } = await runCucumberInlineTest(["hooks"], ["runtime/modern/globals"], {
    parallel: false,
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

  const globalAttachmentRef = allAttachments.find((attachment) => attachment.name === "global-log");
  expect(globalAttachmentRef).toBeDefined();
  expect(globalAttachmentRef!.name).toBe("global-log");
  expect(globalAttachmentRef!.type).toBe("text/plain");

  const encodedAttachment = attachments[globalAttachmentRef!.source] as string;
  expect(Buffer.from(encodedAttachment, "base64").toString("utf-8")).toBe("hello");
});

it("supports globals from hooks", async () => {
  const { globals, attachments } = await runCucumberInlineTest(["hooks"], ["hooks", "runtime/modern/globalsContexts"], {
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

  const beforeAttachmentRef = allAttachments.find((a) => a.name === "before-log");
  expect(beforeAttachmentRef?.type).toBe("text/plain");
  const encodedAttachment = attachments[beforeAttachmentRef!.source] as string;
  expect(Buffer.from(encodedAttachment, "base64").toString("utf-8")).toBe("before");
});

it("does not collect globals from support module scope", async () => {
  const { globals } = await runCucumberInlineTest(["hooks"], ["hooks", "runtime/modern/globalsContexts"], {
    parallel: false,
  });

  const globalsEntries = Object.entries(globals ?? {});
  expect(globalsEntries.length).toBeGreaterThan(0);

  const allErrors = globalsEntries.flatMap(([, info]) => info.errors);
  expect(allErrors).not.toEqual(expect.arrayContaining([{ message: "module scope error" }]));
});
