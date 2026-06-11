import { Stage, Status } from "allure-js-commons";
import { describe, expect, it } from "vitest";

import { runBunInlineTest } from "../../../utils.js";
import { readAttachment } from "../../helpers.js";

describe("sync steps", () => {
  it("handles sync runtime api", async () => {
    const { tests, attachments, exitCode } = await runBunInlineTest({
      "sample.test.ts": `
        import { expect, test } from "bun:test";
        import { attachment, label, step } from "allure-js-commons/sync";

        test("sync step", () => {
          label("mode", "sync");

          const value = step("outer", (ctx) => {
            ctx.displayName("renamed outer");
            ctx.parameter("browser", "chromium");

            step("inner", () => {
              attachment("foo.txt", Buffer.from("bar"), { contentType: "text/plain" });
            });

            return "ok";
          });

          expect(value).toBe("ok");
        });
      `,
    });

    expect(exitCode).toBe(0);
    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual({ name: "mode", value: "sync" });
    expect(tests[0].steps[0]).toMatchObject({
      name: "renamed outer",
      status: Status.PASSED,
      stage: Stage.FINISHED,
      parameters: [{ name: "browser", value: "chromium" }],
    });

    const [innerStep] = tests[0].steps[0].steps;
    expect(innerStep).toMatchObject({
      name: "inner",
      status: Status.PASSED,
      stage: Stage.FINISHED,
    });

    const [attachmentStep] = innerStep.steps;
    const [attachmentRef] = attachmentStep.attachments;

    expect(attachmentStep.name).toBe("foo.txt");
    expect(attachmentRef).toEqual(expect.objectContaining({ name: "foo.txt", type: "text/plain" }));
    expect(readAttachment(attachments, attachmentRef.source)).toBe("bar");
  });

  it("rejects promise-returning sync steps", async () => {
    const { tests, exitCode } = await runBunInlineTest({
      "sample.test.ts": `
        import { test } from "bun:test";
        import { step } from "allure-js-commons/sync";

        test("promise sync step", () => {
          step("promise step", () => Promise.resolve());
        });
      `,
    });

    expect(exitCode).toBe(1);
    expect(tests).toHaveLength(1);
    expect(tests[0].steps[0]).toMatchObject({
      name: "promise step",
      status: Status.BROKEN,
      stage: Stage.FINISHED,
      statusDetails: expect.objectContaining({
        message: expect.stringContaining("must be synchronous"),
      }),
    });
  });
});
