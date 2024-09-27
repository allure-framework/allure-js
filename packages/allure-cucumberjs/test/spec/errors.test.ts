import { expect, it } from "vitest";
import { Status } from "allure-js-commons";
import { runCucumberInlineTest } from "../utils.js";

it("should support playwright expect", async () => {
  const { tests } = await runCucumberInlineTest(["errors"], ["errors"]);

  expect(tests).toHaveLength(1);
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "failed",
      status: Status.FAILED,
      statusDetails: expect.objectContaining({
        message: expect.stringContaining("some message"),
        trace: expect.stringContaining("playwright/lib/matchers/expect.js"),
      }),
      steps: [
        expect.objectContaining({
          name: "Given a step",
          status: Status.FAILED,
          statusDetails: expect.objectContaining({
            message: expect.stringContaining("some message"),
            trace: expect.stringContaining("playwright/lib/matchers/expect.js"),
          }),
        }),
      ],
    }),
  );
});
