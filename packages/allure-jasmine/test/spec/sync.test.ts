import { Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { runJasmineInlineTest } from "../utils.js";

it("handles sync runtime api", async () => {
  const { tests, attachments } = await runJasmineInlineTest({
    "spec/test/sample.spec.js": `
      const { attachment, label, step } = require("allure-js-commons/sync");

      it("sync runtime api", () => {
        label("mode", "sync");

        step("outer", (ctx) => {
          ctx.displayName("renamed outer");
          ctx.parameter("browser", "chromium");

          step("inner", () => {
            attachment("foo.txt", "bar", { contentType: "text/plain" });
          });
        });
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: "mode", value: "sync" }));
  expect(tests[0].steps[0]).toMatchObject({
    name: "renamed outer",
    status: Status.PASSED,
    parameters: [{ name: "browser", value: "chromium" }],
  });

  const [attachmentStep] = tests[0].steps[0].steps[0].steps;
  const [attachment] = attachmentStep.attachments;
  expect(attachmentStep.name).toBe("foo.txt");
  expect(Buffer.from(attachments[attachment.source] as string, "base64").toString("utf8")).toBe("bar");
});

it("writes globals payload from sync runtime API calls", async () => {
  const { globals, attachments } = await runJasmineInlineTest({
    "spec/test/sample.spec.js": `
      const { globalAttachment, globalError } = require("allure-js-commons/sync");

      beforeAll(() => {
        globalAttachment("global-log", "hello", { contentType: "text/plain" });
        globalError({ message: "global setup failed", trace: "stack" });
      });

      it("passes", () => {});
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

  const globalAttachmentRef = allAttachments.find((attachment) => attachment.name === "global-log");
  expect(globalAttachmentRef?.type).toBe("text/plain");
  expect(Buffer.from(attachments[globalAttachmentRef!.source] as string, "base64").toString("utf-8")).toBe(
    "hello",
  );
});
