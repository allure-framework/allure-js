import { expect, it } from "vitest";

import { runCypressInlineTest } from "../../../utils.js";

it("normalizes raw errors and explicit statuses", async () => {
  const { globals } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": ({ allureCommonsModulePath }) => `
      import { Status, globalError } from "${allureCommonsModulePath}";

      it("passes", () => {
        const assertionError = new Error("comparison mismatch");
        Object.assign(assertionError, {
          name: "AssertionError",
          actual: 0,
          expected: false,
        });
        assertionError.stack = "comparison stack";
        Object.freeze(assertionError);

        const runtimeError = new Error("connection lost");
        runtimeError.stack = "connection stack";
        Object.freeze(runtimeError);

        globalError(assertionError);
        globalError(Status.BROKEN, assertionError);
        globalError(runtimeError);
        globalError(Status.FAILED, runtimeError);
      });
    `,
  });

  const errors = Object.values(globals ?? {}).flatMap((entry) => entry.errors);
  expect(errors).toHaveLength(4);
  expect(errors).toEqual(
    expect.arrayContaining([
      {
        status: "failed",
        message: "comparison mismatch",
        trace: "comparison stack",
        actual: "0",
        expected: "false",
        timestamp: expect.any(Number),
      },
      {
        status: "broken",
        message: "comparison mismatch",
        trace: "comparison stack",
        actual: "0",
        expected: "false",
        timestamp: expect.any(Number),
      },
      {
        status: "broken",
        message: "connection lost",
        trace: "connection stack",
        timestamp: expect.any(Number),
      },
      {
        status: "failed",
        message: "connection lost",
        trace: "connection stack",
        timestamp: expect.any(Number),
      },
    ]),
  );
});

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
        status: "broken",
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
