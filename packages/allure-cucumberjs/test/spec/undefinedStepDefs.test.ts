import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runCucumberInlineTest } from "../utils";

it("reports undefined tests and steps", async () => {
  const { tests } = await runCucumberInlineTest(["undefinedStepDefs"], ["undefinedStepDefs"]);

  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "a",
      statusDetails: expect.objectContaining({
        message: "The test doesn't have an implementation.",
      }),
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: "Given undefined step",
          stage: Stage.FINISHED,
        }),
      ]),
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "b",
      status: Status.PASSED,
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: "Given defined step",
          status: Status.PASSED,
          stage: Stage.FINISHED,
        }),
        expect.objectContaining({
          name: "Then another undefined step",
          stage: Stage.FINISHED,
          statusDetails: expect.objectContaining({
            message: "The step doesn't have an implementation.",
          }),
        }),
      ]),
    }),
  );
});
