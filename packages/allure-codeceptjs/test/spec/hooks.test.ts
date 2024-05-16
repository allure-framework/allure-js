import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons/sdk/node";
import { runCodeceptJSInlineTest } from "../utils";

it("handles hooks", async () => {
  const { tests } = await runCodeceptJSInlineTest({
    "sample.test.js": `
      Before(() => {});

      Feature("sample-feature");
      Scenario("sample-scenario", async ({ I }) => {
        I.pass();
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].steps).toHaveLength(2);
  expect(tests[0].steps).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "before hook",
        status: Status.PASSED,
        stage: Stage.FINISHED,
      }),
      expect.objectContaining({
        name: "I pass",
        status: Status.PASSED,
        stage: Stage.FINISHED,
      }),
    ]),
  );
});
