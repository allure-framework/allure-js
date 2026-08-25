import { Stage, Status } from "allure-js-commons";
import { expect, it } from "vitest";

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
  const { tests, groups, globals } = await runCucumberInlineTest(["hooks"], ["failedHooks"]);
  const allErrors = Object.values(globals ?? {}).flatMap((info) => info.errors);

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
  expect(allErrors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        message: expect.stringContaining("hook failed: Error: before error"),
        timestamp: expect.any(Number),
      }),
      expect.objectContaining({
        message: expect.stringContaining("hook failed: Error: after error"),
        timestamp: expect.any(Number),
      }),
    ]),
  );
  expect(allErrors.filter((error) => error.message?.includes("before error"))).toHaveLength(1);
  expect(allErrors.filter((error) => error.message?.includes("after error"))).toHaveLength(1);
});

it("handles failed global hooks", async () => {
  const beforeAllResults = await runCucumberInlineTest(["hooks"], ["failedBeforeAll"], { parallel: false });
  const beforeAllErrors = Object.values(beforeAllResults.globals ?? {}).flatMap((info) => info.errors);

  expect(beforeAllErrors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        message: "BeforeAll hook failed",
        timestamp: expect.any(Number),
      }),
    ]),
  );
  expect(beforeAllErrors.filter((error) => error.message === "BeforeAll hook failed")).toHaveLength(1);

  const afterAllResults = await runCucumberInlineTest(["hooks"], ["failedAfterAll"], { parallel: false });
  const afterAllErrors = Object.values(afterAllResults.globals ?? {}).flatMap((info) => info.errors);

  expect(afterAllResults.tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: Status.PASSED,
      }),
    ]),
  );
  expect(afterAllErrors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        message: "AfterAll hook failed: afterAll error",
        timestamp: expect.any(Number),
      }),
    ]),
  );
  expect(afterAllErrors.filter((error) => error.message === "AfterAll hook failed: afterAll error")).toHaveLength(1);
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
