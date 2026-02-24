import { expect, it } from "vitest";
import { runCypressInlineTest } from "../../../utils.js";

it("writes globals payload from runtime API calls", async () => {
  const { globals, attachments } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": ({ allureCommonsModulePath }) => `
      import { globalAttachment, globalError } from "${allureCommonsModulePath}";

      it("passes", () => {
        globalAttachment("global-log", "hello", { contentType: "text/plain" });
        globalError({ message: "global setup failed", trace: "stack" });
      });
    `,
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
  expect(attachments[globalAttachmentRef!.source] as string).toBe("hello");
});
