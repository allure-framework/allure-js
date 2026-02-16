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
  expect(attachments[globalAttachmentRef.source] as string).toBe("hello");
});
