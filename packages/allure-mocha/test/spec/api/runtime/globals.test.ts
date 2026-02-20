import { expect, it } from "vitest";
import { runMochaInlineTest } from "../../../utils.js";

it("writes globals payload from runtime API calls", async () => {
  const { globals, attachments } = await runMochaInlineTest("globals/runtimeGlobals");

  const globalsEntries = Object.entries(globals ?? {});
  expect(globalsEntries.length).toBeGreaterThan(0);

  const globalsEntry = globalsEntries.find(([, info]) => {
    return (
      info.errors.some((error) => error.message === "global setup failed") &&
      info.attachments.some((attachment) => attachment.name === "global-log")
    );
  });

  expect(globalsEntry).toBeDefined();

  const [globalsFileName, globalInfo] = globalsEntry!;
  expect(globalsFileName).toMatch(/.+-globals\.json/);
  expect(globalInfo.errors).toEqual(
    expect.arrayContaining([
      {
        message: "global setup failed",
        trace: "stack",
      },
    ]),
  );

  const allAttachments = globalsEntries.flatMap(([, info]) => info.attachments);
  expect(allAttachments.length).toBeGreaterThanOrEqual(2);

  const globalAttachmentRef = allAttachments.find((a) => a.name === "global-log");
  const globalPathAttachmentRef = allAttachments.find((a) => a.name === "global-log-path");
  expect(globalAttachmentRef?.type).toBe("text/plain");
  expect(globalPathAttachmentRef?.type).toBe("text/plain");

  const encodedAttachment = attachments[globalAttachmentRef!.source] as string;
  const encodedPathAttachment = attachments[globalPathAttachmentRef!.source] as string;
  expect(Buffer.from(encodedAttachment, "base64").toString("utf-8")).toBe("hello");
  expect(Buffer.from(encodedPathAttachment, "base64").toString("utf-8")).toBe("hello-from-path");
});

it("writes globals payload from hooks and module scope", async () => {
  const { globals, attachments } = await runMochaInlineTest("globals/runtimeGlobalsContexts");

  const globalsEntries = Object.entries(globals ?? {});
  expect(globalsEntries.length).toBeGreaterThan(0);

  const allAttachments = globalsEntries.flatMap(([, info]) => info.attachments);
  const allErrors = globalsEntries.flatMap(([, info]) => info.errors);

  expect(allErrors).toEqual(
    expect.arrayContaining([{ message: "module scope error" }, { message: "after hook error" }]),
  );

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
