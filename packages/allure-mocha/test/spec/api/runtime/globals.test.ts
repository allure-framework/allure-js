import { expect, it } from "vitest";
import { runMochaInlineTest } from "../../../utils.js";

it("writes globals payload from runtime API calls", async () => {
  const { globals, attachments } = await runMochaInlineTest(["globals", "runtimeGlobals"]);

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
  expect(globalInfo.errors).toEqual([
    {
      message: "global setup failed",
      trace: "stack",
    },
  ]);
  expect(globalInfo.attachments).toHaveLength(1);

  const [globalAttachmentRef] = globalInfo.attachments;
  expect(globalAttachmentRef.name).toBe("global-log");
  expect(globalAttachmentRef.type).toBe("text/plain");

  const encodedAttachment = attachments[globalAttachmentRef.source] as string;
  expect(Buffer.from(encodedAttachment, "base64").toString("utf-8")).toBe("hello");
});
