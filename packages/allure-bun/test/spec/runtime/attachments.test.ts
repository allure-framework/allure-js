import { describe, expect, it } from "vitest";

import { runBunInlineTest } from "../../utils.js";
import { readAttachment } from "../helpers.js";

describe("attachments", () => {
  it("adds inline attachments", async () => {
    const { tests, attachments, exitCode } = await runBunInlineTest({
      "sample.test.ts": `
        import { test } from "bun:test";
        import { attachment } from "allure-js-commons";

        test("text attachment", async () => {
          await attachment("foo.txt", "bar", { contentType: "text/plain" });
        });
      `,
    });

    expect(exitCode).toBe(0);
    expect(tests).toHaveLength(1);
    expect(tests[0].steps).toHaveLength(1);

    const [step] = tests[0].steps;
    const [attachment] = step.attachments;

    expect(step.name).toBe("foo.txt");
    expect(attachment).toEqual(
      expect.objectContaining({
        name: "foo.txt",
        type: "text/plain",
      }),
    );
    expect(readAttachment(attachments, attachment.source)).toBe("bar");
  });

  it("adds attachments from paths", async () => {
    const { tests, attachments, exitCode } = await runBunInlineTest({
      "payload.txt": "payload from path",
      "sample.test.ts": `
        import { test } from "bun:test";
        import { attachmentPath } from "allure-js-commons";

        test("path attachment", async () => {
          await attachmentPath("payload.txt", "./payload.txt", { contentType: "text/plain" });
        });
      `,
    });

    expect(exitCode).toBe(0);
    expect(tests).toHaveLength(1);

    const [step] = tests[0].steps;
    const [attachment] = step.attachments;

    expect(step.name).toBe("payload.txt");
    expect(attachment).toEqual(
      expect.objectContaining({
        name: "payload.txt",
        type: "text/plain",
      }),
    );
    expect(readAttachment(attachments, attachment.source)).toBe("payload from path");
  });

  it("adds trace attachments from paths", async () => {
    const { tests, attachments, exitCode } = await runBunInlineTest({
      "trace.zip": "trace payload",
      "sample.test.ts": `
        import { test } from "bun:test";
        import { attachTrace } from "allure-js-commons";

        test("trace attachment", async () => {
          await attachTrace("trace", "./trace.zip");
        });
      `,
    });

    expect(exitCode).toBe(0);
    expect(tests).toHaveLength(1);

    const [step] = tests[0].steps;
    const [attachment] = step.attachments;

    expect(step.name).toBe("trace");
    expect(attachment).toEqual(
      expect.objectContaining({
        name: "trace",
        type: "application/vnd.allure.playwright-trace",
      }),
    );
    expect(readAttachment(attachments, attachment.source)).toBe("trace payload");
  });

  it("adds attachments inside steps", async () => {
    const { tests, attachments, exitCode } = await runBunInlineTest({
      "sample.test.ts": `
        import { test } from "bun:test";
        import { attachment, step } from "allure-js-commons";

        test("step attachment", async () => {
          await step("outer", async () => {
            await attachment("nested.txt", "nested payload", { contentType: "text/plain" });
          });
        });
      `,
    });

    expect(exitCode).toBe(0);
    expect(tests).toHaveLength(1);

    const [attachmentStep] = tests[0].steps[0].steps;
    const [attachment] = attachmentStep.attachments;

    expect(attachmentStep.name).toBe("nested.txt");
    expect(attachment.name).toBe("nested.txt");
    expect(readAttachment(attachments, attachment.source)).toBe("nested payload");
  });
});
