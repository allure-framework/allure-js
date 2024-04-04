import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons/new/sdk/node";
import { runVitestInlineTest } from "../utils.js";

it("reports passed test", async () => {
  const { tests } = await runVitestInlineTest(`
    import { test, expect } from "vitest";

    test("sample test", async () => {
      expect(1).toBe(1);
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.PASSED);
});

it("reports failed test", async () => {
  const { tests } = await runVitestInlineTest(`
    import { test, expect } from "vitest";

    test("sample test", async () => {
      expect(1).toBe(2);
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.FAILED);
});

it("reports broken test", async () => {
  const { tests } = await runVitestInlineTest(`
    import { test, expect } from "vitest";

    test("sample test", async () => {
      throw new Error("broken");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.BROKEN);
});

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
