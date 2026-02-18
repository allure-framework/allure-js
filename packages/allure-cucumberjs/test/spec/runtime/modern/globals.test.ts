import { expect, it } from "vitest";
import { runCucumberInlineTest } from "../../../utils.js";

it("writes globals payload from runtime API calls", async () => {
  const { globals, attachments } = await runCucumberInlineTest(["hooks"], ["runtime/modern/globals"], {
    parallel: false,
  });

  const globalsEntries = Object.entries(globals ?? {});
  expect(globalsEntries).toHaveLength(1);

  const [globalsFileName, globalInfo] = globalsEntries[0];
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

it("supports globals from hooks", async () => {
  const { globals, attachments } = await runCucumberInlineTest(["hooks"], ["hooks", "runtime/modern/globalsContexts"], {
    parallel: false,
  });

  const globalsEntries = Object.entries(globals ?? {});
  expect(globalsEntries).toHaveLength(1);

  const [, globalInfo] = globalsEntries[0];
  expect(globalInfo.errors).toEqual(expect.arrayContaining([{ message: "after hook error" }]));

  const beforeAttachmentRef = globalInfo.attachments.find((a) => a.name === "before-log");
  expect(beforeAttachmentRef?.type).toBe("text/plain");
  const encodedAttachment = attachments[beforeAttachmentRef!.source] as string;
  expect(Buffer.from(encodedAttachment, "base64").toString("utf-8")).toBe("before");
});

it("does not collect globals from support module scope", async () => {
  const { globals } = await runCucumberInlineTest(["hooks"], ["hooks", "runtime/modern/globalsContexts"], {
    parallel: false,
  });

  const globalsEntries = Object.entries(globals ?? {});
  expect(globalsEntries).toHaveLength(1);

  const [, globalInfo] = globalsEntries[0];
  expect(globalInfo.errors).not.toEqual(expect.arrayContaining([{ message: "module scope error" }]));
});
