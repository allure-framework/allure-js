import { Stage, Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { runCucumberInlineTest } from "../utils.js";

it("reports undefined and pending tests and steps", async () => {
  const { tests } = await runCucumberInlineTest(["undefinedStepDefs"], ["undefinedStepDefs"]);

  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "a",
      status: Status.BROKEN,
      statusDetails: expect.objectContaining({
        message: "The step doesn't have an implementation.",
      }),
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: "Given undefined step",
          status: Status.BROKEN,
          stage: Stage.FINISHED,
          statusDetails: expect.objectContaining({
            message: "The step doesn't have an implementation.",
          }),
        }),
      ]),
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "b",
      status: Status.BROKEN,
      statusDetails: expect.objectContaining({
        message: "The step doesn't have an implementation.",
      }),
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: "Given defined step",
          status: Status.PASSED,
          stage: Stage.FINISHED,
        }),
        expect.objectContaining({
          name: "Then another undefined step",
          stage: Stage.FINISHED,
          status: Status.BROKEN,
          statusDetails: expect.objectContaining({
            message: "The step doesn't have an implementation.",
          }),
        }),
      ]),
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "c",
      status: Status.BROKEN,
      statusDetails: expect.objectContaining({
        message: "The step doesn't have an implementation.",
      }),
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: "Given defined step",
          status: Status.PASSED,
          stage: Stage.FINISHED,
        }),
        expect.objectContaining({
          name: "Then pending step",
          status: Status.BROKEN,
          stage: Stage.FINISHED,
          statusDetails: expect.objectContaining({
            message: "The step doesn't have an implementation.",
          }),
        }),
      ]),
    }),
  );
});
