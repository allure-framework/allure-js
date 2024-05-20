import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons/sdk";
import { runCucumberInlineTest } from "../utils";

it("handles basic cases", async () => {
  const { tests } = await runCucumberInlineTest(["simple"], ["simple"]);

  debugger

  expect(tests).toHaveLength(3);
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "passed",
      status: Status.PASSED,
      stage: Stage.FINISHED,
      steps: [
        expect.objectContaining({
          name: "Given a passed step",
          status: Status.PASSED,
          stage: Stage.FINISHED,
        }),
      ],
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "failed",
      status: Status.FAILED,
      stage: Stage.FINISHED,
      steps: [
        expect.objectContaining({
          name: "Given a failed step",
          status: Status.FAILED,
          stage: Stage.FINISHED,
          statusDetails: expect.objectContaining({
            message: expect.stringContaining("AssertionError"),
            trace: expect.any(String),
          }),
        }),
      ],
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "broken",
      status: Status.BROKEN,
      stage: Stage.FINISHED,
      steps: [
        expect.objectContaining({
          name: "Given a broken step",
          status: Status.BROKEN,
          stage: Stage.FINISHED,
          statusDetails: expect.objectContaining({
            message: expect.stringContaining("Error"),
            trace: expect.any(String),
          }),
        }),
      ],
    }),
  );
});
