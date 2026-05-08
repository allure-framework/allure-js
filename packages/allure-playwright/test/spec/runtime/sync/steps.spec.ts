import { Stage, Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { runPlaywrightInlineTest } from "../../../utils.js";

type RuntimeStep = {
  name?: string;
  steps: RuntimeStep[];
};

it("handles sync steps with nested sync steps, expect steps, and attachments", async () => {
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
            attachment("bar.txt", Buffer.from("baz"), { contentType: "text/plain" });
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

  const inner = outer!.steps.find((step) => step.name === "inner");
  expect(inner).toMatchObject({
    status: Status.PASSED,
    stage: Stage.FINISHED,
  });
  expect(outer!.steps.find((step) => step.name.includes('Expect "toBe"'))).toBeUndefined();
  expect(inner!.steps.find((step) => step.name.includes('Expect "toContain"'))).toBeUndefined();
  expect(tests[0].steps.find((step) => step.name.includes('Expect "toBe"'))).toBeDefined();
  expect(tests[0].steps.find((step) => step.name.includes('Expect "toContain"'))).toBeDefined();

  const innerAttachmentStep = inner!.steps.find((step) => step.name === "bar.txt");
  expect(innerAttachmentStep).toBeDefined();
  const [innerAttachmentRef] = innerAttachmentStep!.attachments;
  expect(Buffer.from(attachments[innerAttachmentRef.source] as string, "base64").toString("utf8")).toBe("baz");

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
  expect(syncInner!.steps.find((step) => step.name.includes('Expect "toBe"'))).toBeUndefined();
  expect(asyncOuter!.steps.find((step) => step.name.includes('Expect "toBe"'))).toBeDefined();

  const syncAttachmentStep = syncInner!.steps.find((step) => step.name === "sync.txt");
  expect(syncAttachmentStep).toBeDefined();
  expect(Buffer.from(attachments[syncAttachmentStep!.attachments[0].source] as string, "base64").toString("utf8")).toBe(
    "sync",
  );
});

it("keeps mixed async and sync runtime step nesting isolated", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.ts": `
      import { test } from "@playwright/test";
      import { step as asyncStep } from "allure-js-commons";
      import { step as syncStep } from "allure-js-commons/sync";

      test("mixed step tree", async () => {
        await asyncStep("async step1", async () => {
          await asyncStep("async step1.1", async () => {
            syncStep("sync step1.1.1", () => {});
          });

          syncStep("sync step1.2", () => {
            syncStep("sync step1.2.1", () => {});
          });

          await asyncStep("async step1.3", async () => {
            await asyncStep("async step1.3.1", async () => {});
            syncStep("sync step1.3.2", () => {});
          });
        });
      });
    `,
  });

  expect(tests).toHaveLength(1);

  const assertPassedStep = (step: RuntimeStep | undefined) => {
    expect(step).toMatchObject({
      status: Status.PASSED,
      stage: Stage.FINISHED,
    });
    return step!;
  };

  const step1 = assertPassedStep(tests[0].steps.find((step) => step.name === "async step1"));
  expect(step1.steps.map((step) => step.name)).toEqual(["async step1.1", "sync step1.2", "async step1.3"]);

  const step11 = assertPassedStep(step1.steps.find((step) => step.name === "async step1.1"));
  expect(step11.steps.map((step) => step.name)).toEqual(["sync step1.1.1"]);

  const step111 = assertPassedStep(step11.steps.find((step) => step.name === "sync step1.1.1"));
  expect(step111.steps).toEqual([]);

  const step12 = assertPassedStep(step1.steps.find((step) => step.name === "sync step1.2"));
  expect(step12.steps.map((step) => step.name)).toEqual(["sync step1.2.1"]);

  const step121 = assertPassedStep(step12.steps.find((step) => step.name === "sync step1.2.1"));
  expect(step121.steps).toEqual([]);

  const step13 = assertPassedStep(step1.steps.find((step) => step.name === "async step1.3"));
  expect(step13.steps.map((step) => step.name)).toEqual(["async step1.3.1", "sync step1.3.2"]);

  const step131 = assertPassedStep(step13.steps.find((step) => step.name === "async step1.3.1"));
  expect(step131.steps).toEqual([]);

  const step132 = assertPassedStep(step13.steps.find((step) => step.name === "sync step1.3.2"));
  expect(step132.steps).toEqual([]);
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
  expect(failedStep!.steps.find((step) => step.name.includes('Expect "toBe"'))).toBeUndefined();
  expect(tests[0].steps.find((step) => step.name.includes('Expect "toBe"'))).toBeDefined();
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
