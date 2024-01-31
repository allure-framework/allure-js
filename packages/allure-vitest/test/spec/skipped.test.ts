import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runVitestInlineTest } from "../utils.js";

it("reports manually skipped tests", async () => {
  const { tests } = await runVitestInlineTest(
    `
    import { test } from "vitest";

    test("skipped", (ctx) => {
      ctx.skip();
    })
    `,
  );

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.SKIPPED);
  expect(tests[0].stage).toBe(Stage.PENDING);
});

it("doesn't report skipped tests and suites", async () => {
  const { tests } = await runVitestInlineTest(
    `
    import { describe, test } from "vitest";

    test.skip("skipped", () => {})

    describe.skip("skipped", () => {
      test("not skipped", () => {})
    })
    `,
  );

  expect(tests).toHaveLength(0);
});
