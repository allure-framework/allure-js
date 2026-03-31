import { LabelName, Stage, Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { runCucumberInlineTest } from "../../../utils.js";

it("handles runtime steps", async () => {
  const { tests } = await runCucumberInlineTest(["steps"], ["runtime/modern/steps"]);

  expect(tests).toHaveLength(2);
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "succeed",
      status: Status.PASSED,
      stage: Stage.FINISHED,
      labels: expect.arrayContaining([
        {
          name: LabelName.EPIC,
          value: "foo",
        },
        {
          name: "label_name",
          value: "label_value",
        },
      ]),
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: "Given allows to define runtime step",
          status: Status.PASSED,
          stage: Stage.FINISHED,
          steps: expect.arrayContaining([
            expect.objectContaining({
              name: "first nested step",
              status: Status.PASSED,
              stage: Stage.FINISHED,
              steps: expect.arrayContaining([
                expect.objectContaining({
                  name: "second nested step",
                  steps: [
                    expect.objectContaining({
                      name: "My attachment",
                      attachments: expect.arrayContaining([
                        expect.objectContaining({
                          name: "My attachment",
                          type: "application/json",
                          source: expect.any(String),
                        }),
                      ]),
                    }),
                  ],
                }),
              ]),
            }),
          ]),
        }),
      ]),
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "broken",
      status: Status.BROKEN,
      stage: Stage.FINISHED,
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: "Given allows to define another broken runtime step",
          status: Status.BROKEN,
          stage: Stage.FINISHED,
          steps: expect.arrayContaining([
            expect.objectContaining({
              name: "first nested step",
              status: Status.BROKEN,
              stage: Stage.FINISHED,
            }),
          ]),
        }),
      ]),
    }),
  );
});

it("handles runtime stages", async () => {
  const { tests } = await runCucumberInlineTest(["stages"], ["runtime/modern/stages"]);

  expect(tests).toHaveLength(1);
  expect(tests[0]).toMatchObject({
    name: "succeed",
    status: Status.PASSED,
    stage: Stage.FINISHED,
  });
  expect(tests[0].steps).toHaveLength(1);
  expect(tests[0].steps[0]).toMatchObject({
    name: "Given allows to define runtime stages",
    stage: Stage.FINISHED,
  });
  expect(tests[0].steps[0].steps).toMatchObject([
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
