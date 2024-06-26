import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runCucumberInlineTest } from "../utils.js";

it("handles passed hooks", async () => {
  const { tests, groups } = await runCucumberInlineTest(["hooks"], ["hooks"]);

  expect(tests).toHaveLength(1);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        steps: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
          }),
        ]),
      }),
    ]),
  );
  expect(groups).toHaveLength(2);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        befores: [
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
          }),
        ],
        afters: [],
      }),
      expect.objectContaining({
        befores: [],
        afters: [
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
          }),
        ],
      }),
    ]),
  );
});

it("handles failed hooks", async () => {
  const { tests, groups } = await runCucumberInlineTest(["hooks"], ["failedHooks"]);

  expect(tests).toHaveLength(1);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: Status.SKIPPED,
        stage: Stage.FINISHED,
        steps: expect.arrayContaining([
          expect.objectContaining({
            status: Status.SKIPPED,
          }),
        ]),
      }),
    ]),
  );
  expect(groups).toHaveLength(2);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        befores: [
          expect.objectContaining({
            status: Status.BROKEN,
            stage: Stage.FINISHED,
            statusDetails: expect.objectContaining({
              message: expect.stringContaining("before error"),
            }),
          }),
        ],
        afters: [],
      }),
      expect.objectContaining({
        befores: [],
        afters: [
          expect.objectContaining({
            status: Status.BROKEN,
            stage: Stage.FINISHED,
            statusDetails: expect.objectContaining({
              message: expect.stringContaining("after error"),
            }),
          }),
        ],
      }),
    ]),
  );
});

it("handles hooks with steps", async () => {
  const { tests, groups } = await runCucumberInlineTest(["hooks"], ["hooksSteps"]);

  expect(tests).toHaveLength(1);
  const [testResult] = tests;

  expect(testResult.steps).toEqual([
    expect.objectContaining({
      name: "Given a passed step",
      status: Status.PASSED,
      steps: [
        expect.objectContaining({
          name: "sub step 1",
          status: Status.PASSED,
        }),
        expect.objectContaining({
          name: "sub step 2",
          status: Status.PASSED,
        }),
      ],
    }),
  ]);
  expect(groups).toHaveLength(2);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        befores: [
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            steps: [
              expect.objectContaining({
                name: "before step 1",
                status: Status.PASSED,
              }),
              expect.objectContaining({
                name: "before step 2",
                status: Status.PASSED,
              }),
            ],
          }),
        ],
        afters: [],
      }),
      expect.objectContaining({
        befores: [],
        afters: [
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            steps: [
              expect.objectContaining({
                name: "after step 1",
                status: Status.PASSED,
              }),
              expect.objectContaining({
                name: "after step 2",
                status: Status.PASSED,
              }),
            ],
          }),
        ],
      }),
    ]),
  );
});
