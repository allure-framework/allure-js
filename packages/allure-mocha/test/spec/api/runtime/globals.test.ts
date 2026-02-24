import { expect, it } from "vitest";
import { runMochaInlineTest } from "../../../utils.js";

it("writes globals payload from runtime API calls", async () => {
  const { globals, attachments } = await runMochaInlineTest("globals/runtimeGlobals");

  const globalsEntries = Object.entries(globals ?? {});
  expect(globalsEntries.length).toBeGreaterThan(0);

  globalsEntries.forEach(([globalsFileName]) => {
    expect(globalsFileName).toMatch(/.+-globals\.json/);
  });
  const allAttachments = globalsEntries.flatMap(([, info]) => info.attachments);
  const allErrors = globalsEntries.flatMap(([, info]) => info.errors);
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
  expect(globalAttachmentRef?.type).toBe("text/plain");

  const encodedAttachment = attachments[globalAttachmentRef!.source] as string;
  expect(Buffer.from(encodedAttachment, "base64").toString("utf-8")).toBe("hello");
});

it("supports globals from hooks, but not from module scope", async () => {
  const { globals, attachments } = await runMochaInlineTest("globals/runtimeGlobalsContexts");

  const globalsEntries = Object.entries(globals ?? {});
  expect(globalsEntries.length).toBeGreaterThan(0);

  const allAttachments = globalsEntries.flatMap(([, info]) => info.attachments);
  const allErrors = globalsEntries.flatMap(([, info]) => info.errors);

  expect(allErrors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        message: "after hook error",
        timestamp: expect.any(Number),
      }),
    ]),
  );
  expect(allErrors.filter((error) => error.message === "module scope error")).toHaveLength(0);
  expect(allErrors.filter((error) => error.message === "after hook error")).toHaveLength(1);
  allErrors.forEach((error) => {
    expect(error.timestamp).toEqual(expect.any(Number));
  });
  allAttachments.forEach((attachment) => {
    expect(attachment.timestamp).toEqual(expect.any(Number));
  });

  const beforeAttachmentRef = allAttachments.find((a) => a.name === "before-log");
  expect(beforeAttachmentRef?.type).toBe("text/plain");
  const encodedBeforeAttachment = attachments[beforeAttachmentRef!.source] as string;
  expect(Buffer.from(encodedBeforeAttachment, "base64").toString("utf-8")).toBe("before");
});

it("does not collect globals from setup-only file without tests", async () => {
  const { globals, tests } = await runMochaInlineTest("globals/runtimeGlobalsSetupOnly");

  expect(tests).toHaveLength(0);
  expect(Object.keys(globals ?? {})).toHaveLength(0);
});
