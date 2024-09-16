import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runCucumberInlineTest } from "../utils.js";

it("handles basic cases", async () => {
  const { tests } = await runCucumberInlineTest(["simple"], ["simple"]);

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

it("should set full name", async () => {
  const { tests } = await runCucumberInlineTest(["simple"], ["simple"]);

  expect(tests).toHaveLength(3);
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "passed",
      fullName: "features/simple.feature#passed",
      status: Status.PASSED,
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "failed",
      fullName: "features/simple.feature#failed",
      status: Status.FAILED,
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "broken",
      fullName: "features/simple.feature#broken",
      status: Status.BROKEN,
    }),
  );
});

it("should calculate fullName in a CWD-independent manner", async () => {
  const { tests } = await runCucumberInlineTest(["nested/simple"], ["simple"], { cwd: "features/nested" });

  expect(tests).toHaveLength(3);
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "passed",
      fullName: "features/nested/simple.feature#passed",
      status: Status.PASSED,
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "failed",
      fullName: "features/nested/simple.feature#failed",
      status: Status.FAILED,
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "broken",
      fullName: "features/nested/simple.feature#broken",
      status: Status.BROKEN,
    }),
  );
});
