import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runJestInlineTest } from "../utils.js";

it("supports test.each", async () => {
  const { tests } = await runJestInlineTest({
    "sample.test.js": `
      test.each([
        [1, 2, 3],
        [2, 3, 5],
        [3, 4, 7],
      ])("%i + %i = %i", (a, b, c) => {
        expect(a + b).toBe(c);
      });
    `
  });

  expect(tests).toHaveLength(3);
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "1 + 2 = 3",
      status: Status.PASSED,
      stage: Stage.FINISHED,
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "2 + 3 = 5",
      status: Status.PASSED,
      stage: Stage.FINISHED,
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "3 + 4 = 7",
      status: Status.PASSED,
      stage: Stage.FINISHED,
    }),
  );
});
