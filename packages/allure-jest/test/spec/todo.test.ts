import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runJestInlineTest } from "../utils.js";

it("todo", async () => {
  const { tests } = await runJestInlineTest({
    "sample.test.js": `
      it.todo("todo")
    `,
  });

  expect(tests).toHaveLength(1);
  const [tr] = tests;

  expect(tr).toEqual(
    expect.objectContaining({
      stage: Stage.FINISHED,
      status: Status.SKIPPED,
      statusDetails: expect.objectContaining({
        message: "TODO",
      }),
    }),
  );
});
