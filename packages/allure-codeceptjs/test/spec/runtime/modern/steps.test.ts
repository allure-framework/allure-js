import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
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
