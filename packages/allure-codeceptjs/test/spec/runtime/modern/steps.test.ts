import { Stage, Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { runCodeceptJsInlineTest } from "../../../utils.js";

it("handles lambda steps", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "sample.test.js": `
      const { step } = require("allure-js-commons");

      Feature("sample-feature-1");
      Scenario("scenario1", async ({ I }) => {
        await step("step1", async () => {
          await step("step2", async () => {
            await I.pass();
          });
        });
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].steps).toHaveLength(1);
  expect(tests[0].steps).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "step1",
        status: Status.PASSED,
        stage: Stage.FINISHED,
        steps: expect.arrayContaining([
          expect.objectContaining({
            name: "step2",
            status: Status.PASSED,
            stage: Stage.FINISHED,
            steps: expect.arrayContaining([
              expect.objectContaining({
                name: "I pass",
                status: Status.PASSED,
                stage: Stage.FINISHED,
              }),
            ]),
          }),
        ]),
      }),
    ]),
  );
});

it("handles runtime stages", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "sample.test.js": `
      const { logStep, stage, step } = require("allure-js-commons");

      Feature("sample-feature-1");
      Scenario("scenario1", async () => {
        stage("stage 1");
        await logStep("a");
        await step("b", async () => {
          await logStep("b 1");
          stage("b 2");
          await logStep("b 2 nested");
        });

        stage("stage 2");
        await logStep("c");
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].steps).toMatchObject([
    {
      name: "stage 1",
      status: Status.PASSED,
      stage: Stage.FINISHED,
      steps: [
        {
          name: "a",
          status: Status.PASSED,
          stage: Stage.FINISHED,
        },
        {
          name: "b",
          status: Status.PASSED,
          stage: Stage.FINISHED,
          steps: [
            {
              name: "b 1",
              status: Status.PASSED,
              stage: Stage.FINISHED,
            },
            {
              name: "b 2",
              status: Status.PASSED,
              stage: Stage.FINISHED,
              steps: [
                {
                  name: "b 2 nested",
                  status: Status.PASSED,
                  stage: Stage.FINISHED,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "stage 2",
      status: Status.PASSED,
      stage: Stage.FINISHED,
      steps: [
        {
          name: "c",
          status: Status.PASSED,
          stage: Stage.FINISHED,
        },
      ],
    },
  ]);
});
