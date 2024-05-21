import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runVitestInlineTest } from "../../../utils.js";

it("handles single lambda step", async () => {
  const { tests } = await runVitestInlineTest(`
    import { test } from "vitest";

    test("steps", async () => {
      await allure.step("step", () => {});
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].steps).toHaveLength(1);
  expect(tests[0].steps).toContainEqual(
    expect.objectContaining({
      name: "step",
    }),
  );
});

it("handles single lambda step with attachment", async () => {
  const { tests, attachments } = await runVitestInlineTest(`
    import { test } from "vitest";

    test("steps", async () => {
      await allure.step("step", async () => {
        await allure.attachment("foo.txt", Buffer.from("bar"), "text/plain");
      });
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].steps).toHaveLength(1);
  expect(tests[0].steps[0].attachments).toHaveLength(1);

  const [attachment] = tests[0].steps[0].attachments;

  expect(attachment.name).toBe("foo.txt");
  expect(attachment.type).toBe("text/plain");
  expect(Buffer.from(attachments[attachment.source] as string, "base64").toString("utf8")).toBe("bar");
});

it("handles nested lambda steps", async () => {
  const { tests } = await runVitestInlineTest(`
    import { test } from "vitest";

    test("steps", async () => {
      await allure.step("step 1", async () => {
        await allure.step("step 2", async () => {
          await allure.step("step 3", () => {
          });
        });
      });
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].steps).toHaveLength(1);
  expect(tests[0].steps[0]).toMatchObject({
    name: "step 1",
    status: Status.PASSED,
    stage: Stage.FINISHED,
  });
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

it("handles step renaming", async () => {
  const { tests } = await runVitestInlineTest(`
    import { test } from "vitest";

    test("steps", async () => {
      await allure.step("foo", async (ctx) => {
        await ctx.displayName("bar");
      });
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].steps).toHaveLength(1);
  expect(tests[0].steps[0].name).toEqual("bar");
});

it("supports step parameters", async () => {
  const { tests } = await runVitestInlineTest(`
    import { test } from "vitest";

    test("steps", async () => {
      await allure.step("foo", async (ctx) => {
        await ctx.parameter("p1", "v1");
        await ctx.parameter("p2", "v2", "default");
        await ctx.parameter("p3", "v3", "masked");
        await ctx.parameter("p4", "v4", "hidden");
      });
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].steps).toHaveLength(1);
  const actualStepParameters = tests[0].steps[0].parameters;
  expect(actualStepParameters).toEqual([
    { name: "p1", value: "v1" },
    { name: "p2", value: "v2", mode: "default" },
    { name: "p3", value: "v3", mode: "masked" },
    { name: "p4", value: "v4", mode: "hidden" },
  ]);
});
