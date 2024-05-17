import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons/sdk/node";
import { runCodeceptJSInlineTest } from "../../../utils";

it("handles codeceptjs steps", async () => {
  const { tests } = await runCodeceptJSInlineTest({
    "sample.test.js": `
      Feature("sample-feature-1");
      Scenario("passed-scenario1", async ({ I }) => {
        await I.pass();
      });

      Feature("sample-feature-2");
      Scenario("failed-scenario1", async ({ I }) => {
        await I.fail();
      });
    `,
  });

  expect(tests).toHaveLength(2);
  expect(tests[0].steps).toHaveLength(1);
  expect(tests[0].steps).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "I pass",
        status: Status.PASSED,
        stage: Stage.FINISHED,
      }),
    ]),
  );
  expect(tests[1].steps).toHaveLength(1);
  expect(tests[1].steps).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "I fail",
        status: Status.FAILED,
        stage: Stage.FINISHED,
      }),
    ]),
  );
});

it("handles lambda steps", async () => {
  const { tests } = await runCodeceptJSInlineTest({
    "sample.test.js": `
      Feature("sample-feature-1");
      Scenario("scenario1", async ({ I }) => {
        const allure = codeceptjs.container.plugins("allure");

        await allure.step("step1", async () => {
          await allure.step("step2", async () => {
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
