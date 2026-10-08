import { Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { runTestCafeInlineTest } from "../utils.js";

it("writes enriched global errors without failing the active test", async () => {
  const { globals, tests } = await runTestCafeInlineTest({
    "pages/basic.html": "<html><body>Globals</body></html>",
    "tests/globals.test.js": `
      const { Status, globalError } = require("allure-js-commons");

      fixture\`Globals\`.page\`\${process.env.TESTCAFE_BASE_URL}/pages/basic.html\`;

      test("passes", async t => {
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

        await globalError(assertionError);
        await globalError(Status.BROKEN, assertionError);
        await globalError(runtimeError);
        await globalError(Status.FAILED, runtimeError);
        await t.expect(true).ok();
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.PASSED);

  const errors = Object.values(globals ?? {}).flatMap((entry) => entry.errors);
  expect(errors).toHaveLength(4);
  expect(errors).toEqual(
    expect.arrayContaining([
      {
        status: Status.FAILED,
        message: "comparison mismatch",
        trace: "comparison stack",
        actual: "0",
        expected: "false",
        timestamp: expect.any(Number),
      },
      {
        status: Status.BROKEN,
        message: "comparison mismatch",
        trace: "comparison stack",
        actual: "0",
        expected: "false",
        timestamp: expect.any(Number),
      },
      {
        status: Status.BROKEN,
        message: "connection lost",
        trace: "connection stack",
        timestamp: expect.any(Number),
      },
      {
        status: Status.FAILED,
        message: "connection lost",
        trace: "connection stack",
        timestamp: expect.any(Number),
      },
    ]),
  );
});
