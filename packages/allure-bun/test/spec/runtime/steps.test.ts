import { Stage, Status } from "allure-js-commons";
import { describe, expect } from "vitest";

import { runBunInlineTest } from "../../utils.js";
import { bunIt } from "../helpers.js";

describe("steps", () => {
  bunIt("handles single lambda steps", async () => {
    const { tests, exitCode } = await runBunInlineTest({
      "sample.test.ts": `
        import { test } from "bun:test";
        import { step } from "allure-js-commons";

        test("steps", async () => {
          await step("step", () => {});
        });
      `,
    });

    expect(exitCode).toBe(0);
    expect(tests).toHaveLength(1);
    expect(tests[0].steps).toContainEqual(
      expect.objectContaining({
        name: "step",
        status: Status.PASSED,
        stage: Stage.FINISHED,
      }),
    );
  });

  bunIt("preserves nested lambda steps", async () => {
    const { tests, exitCode } = await runBunInlineTest({
      "sample.test.ts": `
        import { test } from "bun:test";
        import { step } from "allure-js-commons";

        test("nested steps", async () => {
          await step("step 1", async () => {
            await step("step 2", async () => {
              await step("step 3", () => {});
            });
          });
        });
      `,
    });

    expect(exitCode).toBe(0);
    expect(tests).toHaveLength(1);
    expect(tests[0].steps).toHaveLength(1);
    expect(tests[0].steps[0]).toMatchObject({ name: "step 1", status: Status.PASSED, stage: Stage.FINISHED });
    expect(tests[0].steps[0].steps).toHaveLength(1);
    expect(tests[0].steps[0].steps[0]).toMatchObject({
      name: "step 2",
      status: Status.PASSED,
      stage: Stage.FINISHED,
    });
    expect(tests[0].steps[0].steps[0].steps).toHaveLength(1);
    expect(tests[0].steps[0].steps[0].steps[0]).toMatchObject({
      name: "step 3",
      status: Status.PASSED,
      stage: Stage.FINISHED,
    });
  });

  bunIt("supports step display names and parameters", async () => {
    const { tests, exitCode } = await runBunInlineTest({
      "sample.test.ts": `
        import { test } from "bun:test";
        import { step } from "allure-js-commons";

        test("step metadata", async () => {
          await step("original", async (ctx) => {
            await ctx.displayName("renamed");
            await ctx.parameter("p1", "v1");
            await ctx.parameter("p2", "v2", "default");
            await ctx.parameter("p3", "v3", "masked");
            await ctx.parameter("p4", "v4", "hidden");
          });
        });
      `,
    });

    expect(exitCode).toBe(0);
    expect(tests).toHaveLength(1);
    expect(tests[0].steps).toHaveLength(1);
    expect(tests[0].steps[0]).toEqual(
      expect.objectContaining({
        name: "renamed",
        parameters: [
          { name: "p1", value: "v1" },
          { name: "p2", value: "v2", mode: "default" },
          { name: "p3", value: "v3", mode: "masked" },
          { name: "p4", value: "v4", mode: "hidden" },
        ],
      }),
    );
  });

  bunIt("returns step callback values", async () => {
    const { tests, exitCode } = await runBunInlineTest({
      "sample.test.ts": `
        import { expect, test } from "bun:test";
        import { step } from "allure-js-commons";

        test("step return", async () => {
          const value = await step("get value", () => "ok");

          expect(value).toBe("ok");
        });
      `,
    });

    expect(exitCode).toBe(0);
    expect(tests).toHaveLength(1);
    expect(tests[0].steps).toContainEqual(expect.objectContaining({ name: "get value", status: Status.PASSED }));
  });

  bunIt("records failed lambda steps and rethrows errors", async () => {
    const { tests, exitCode } = await runBunInlineTest({
      "sample.test.ts": `
        import { test } from "bun:test";
        import { step } from "allure-js-commons";

        test("failed step", async () => {
          await step("boom step", () => {
            throw new Error("boom");
          });
        });
      `,
    });

    expect(exitCode).toBe(1);
    expect(tests).toHaveLength(1);
    expect(tests[0]).toEqual(expect.objectContaining({ status: Status.BROKEN, stage: Stage.FINISHED }));
    expect(tests[0].steps).toContainEqual(
      expect.objectContaining({
        name: "boom step",
        status: Status.BROKEN,
        statusDetails: expect.objectContaining({ message: "boom" }),
      }),
    );
  });

  bunIt("adds instant log steps", async () => {
    const { tests, exitCode } = await runBunInlineTest({
      "sample.test.ts": `
        import { test } from "bun:test";
        import { Status, logStep } from "allure-js-commons";

        test("log steps", async () => {
          await logStep("instant passed");
          await logStep("instant broken", Status.BROKEN, new Error("instant boom"));
        });
      `,
    });

    expect(exitCode).toBe(0);
    expect(tests).toHaveLength(1);
    expect(tests[0].steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "instant passed", status: Status.PASSED, stage: Stage.FINISHED }),
        expect.objectContaining({
          name: "instant broken",
          status: Status.BROKEN,
          stage: Stage.FINISHED,
          statusDetails: expect.objectContaining({ message: "instant boom" }),
        }),
      ]),
    );
  });
});
