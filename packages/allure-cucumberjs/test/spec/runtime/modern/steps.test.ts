import { expect, it } from "vitest";
import { LabelName, Stage, Status } from "allure-js-commons";
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
                  steps: [expect.objectContaining({
                    name: "My attachment",
                    attachments: expect.arrayContaining([
                      expect.objectContaining({
                        name: "My attachment",
                        type: "application/json",
                        source: expect.any(String),
                      }),
                    ]),
                  })]
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
