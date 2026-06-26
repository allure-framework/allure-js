import { Stage, Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { runCucumberInlineTest } from "../utils.js";

it("includes background steps in each scenario", async () => {
  const { tests } = await runCucumberInlineTest(["background"], ["background"]);

  expect(tests).toHaveLength(2);

  const backgroundSteps = [
    expect.objectContaining({
      name: "Given a background step",
      status: Status.PASSED,
      stage: Stage.FINISHED,
    }),
    expect.objectContaining({
      name: "And another background step",
      status: Status.PASSED,
      stage: Stage.FINISHED,
    }),
  ];

  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "passed with background",
      status: Status.PASSED,
      stage: Stage.FINISHED,
      steps: [
        ...backgroundSteps,
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
      name: "failed with background",
      status: Status.FAILED,
      stage: Stage.FINISHED,
      steps: [
        ...backgroundSteps,
        expect.objectContaining({
          name: "Given a failed step",
          status: Status.FAILED,
          stage: Stage.FINISHED,
        }),
      ],
    }),
  );
});
