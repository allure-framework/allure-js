import { Stage, Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { runPlaywrightInlineTest } from "../../../utils.js";

it("handles sync steps with nested expect steps and attachments", async () => {
  const { tests, attachments } = await runPlaywrightInlineTest({
    "sample.test.ts": `
      import { test, expect } from "@playwright/test";
      import { attachment, step } from "allure-js-commons/sync";

      test("steps", async () => {
        step("outer", (ctx) => {
          ctx.displayName("custom outer");
          ctx.parameter("browser", "chromium");
          attachment("foo.txt", Buffer.from("bar"), { contentType: "text/plain" });
          expect(1).toBe(1);

          step("inner", () => {
            expect("abc").toContain("a");
          });
        });
      });
    `,
  });

  expect(tests).toHaveLength(1);
  const outer = tests[0].steps.find((step) => step.name === "custom outer");
  expect(outer).toMatchObject({
    status: Status.PASSED,
    stage: Stage.FINISHED,
    parameters: [{ name: "browser", value: "chromium" }],
  });

  const expectStep = outer!.steps.find((step) => step.name.includes('Expect "toBe"'));
  expect(expectStep).toBeDefined();

  const inner = outer!.steps.find((step) => step.name === "inner");
  expect(inner).toMatchObject({
    status: Status.PASSED,
    stage: Stage.FINISHED,
  });
  expect(inner!.steps[0].name).toContain('Expect "toContain"');

  const attachmentStep = outer!.steps.find((step) => step.name === "foo.txt");
  expect(attachmentStep).toBeDefined();
  const [attachmentRef] = attachmentStep!.attachments;
  expect(attachmentRef.name).toBe("foo.txt");
  expect(attachmentRef.type).toBe("text/plain");
  expect(Buffer.from(attachments[attachmentRef.source] as string, "base64").toString("utf8")).toBe("bar");
});

it("supports sync steps nested inside async runtime steps", async () => {
  const { tests, attachments } = await runPlaywrightInlineTest({
    "sample.test.ts": `
      import { test, expect } from "@playwright/test";
      import { attachment, step as asyncStep } from "allure-js-commons";
      import { attachment as syncAttachment, step as syncStep } from "allure-js-commons/sync";

      test("mixed steps", async () => {
        await asyncStep("async outer", async () => {
          await attachment("async.txt", Buffer.from("async"), "text/plain");

          syncStep("sync inner", () => {
            syncAttachment("sync.txt", Buffer.from("sync"), { contentType: "text/plain" });
            expect(1).toBe(1);
          });
        });
      });
    `,
  });

  expect(tests).toHaveLength(1);
  const asyncOuter = tests[0].steps.find((step) => step.name === "async outer");
  expect(asyncOuter).toBeDefined();

  const asyncAttachmentStep = asyncOuter!.steps.find((step) => step.name === "async.txt");
  expect(asyncAttachmentStep).toBeDefined();
  expect(
    Buffer.from(attachments[asyncAttachmentStep!.attachments[0].source] as string, "base64").toString("utf8"),
  ).toBe("async");

  const syncInner = asyncOuter!.steps.find((step) => step.name === "sync inner");
  expect(syncInner).toMatchObject({
    status: Status.PASSED,
    stage: Stage.FINISHED,
  });
  expect(syncInner!.steps.find((step) => step.name.includes('Expect "toBe"'))).toBeDefined();

  const syncAttachmentStep = syncInner!.steps.find((step) => step.name === "sync.txt");
  expect(syncAttachmentStep).toBeDefined();
  expect(Buffer.from(attachments[syncAttachmentStep!.attachments[0].source] as string, "base64").toString("utf8")).toBe(
    "sync",
  );
});

it("marks generic sync step errors as broken", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.ts": `
      import { test } from "@playwright/test";
      import { step } from "allure-js-commons/sync";

      test("steps", async () => {
        step("broken sync step", () => {
          throw new Error("boom");
        });
      });
    `,
  });

  expect(tests).toHaveLength(1);
  const brokenStep = tests[0].steps.find((step) => step.name === "broken sync step");
  expect(brokenStep).toMatchObject({
    status: Status.BROKEN,
    stage: Stage.FINISHED,
    statusDetails: expect.objectContaining({
      message: expect.stringContaining("boom"),
    }),
  });
});

it("marks assertion failures inside sync steps as failed", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.ts": `
      import { test, expect } from "@playwright/test";
      import { step } from "allure-js-commons/sync";

      test("steps", async () => {
        step("failed sync step", () => {
          expect(1).toBe(2);
        });
      });
    `,
  });

  expect(tests).toHaveLength(1);
  const failedStep = tests[0].steps.find((step) => step.name === "failed sync step");
  expect(failedStep).toMatchObject({
    status: Status.FAILED,
    stage: Stage.FINISHED,
  });
  expect(failedStep!.steps.find((step) => step.name.includes('Expect "toBe"'))).toBeDefined();
});

it("doesn't infect parent sync steps with handled child step failures", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.ts": `
      import { test, expect } from "@playwright/test";
      import { step } from "allure-js-commons/sync";

      test("steps", async () => {
        step("outer", () => {
          try {
            step("inner", () => {
              expect(1).toBe(2);
            });
          } catch {}
        });
      });
    `,
  });

  expect(tests).toHaveLength(1);
  const outer = tests[0].steps.find((step) => step.name === "outer");
  expect(outer).toMatchObject({
    status: Status.PASSED,
    stage: Stage.FINISHED,
  });

  const inner = outer!.steps.find((step) => step.name === "inner");
  expect(inner).toMatchObject({
    status: Status.FAILED,
    stage: Stage.FINISHED,
  });
});

it("rejects promise-returning sync steps", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.ts": `
      import { test } from "@playwright/test";
      import { step } from "allure-js-commons/sync";

      test("steps", async () => {
        step("promise sync step", () => Promise.resolve());
      });
    `,
  });

  expect(tests).toHaveLength(1);
  const brokenStep = tests[0].steps.find((step) => step.name === "promise sync step");
  expect(brokenStep).toMatchObject({
    status: Status.BROKEN,
    stage: Stage.FINISHED,
    statusDetails: expect.objectContaining({
      message: expect.stringContaining("must be synchronous"),
    }),
  });
});
