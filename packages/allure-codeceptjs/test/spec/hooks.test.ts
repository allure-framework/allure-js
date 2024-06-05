import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runCodeceptJsInlineTest } from "../utils.js";

it("handles hooks", async () => {
  const { tests, groups } = await runCodeceptJsInlineTest({
    "sample.test.js": `
      Feature("sample-feature");

      BeforeAll(() => {});
      AfterAll(() => {});

      Before(() => {});
      After(() => {});

      // these hooks shouldn't be reported because codeceptjs doesn't provide any information about them
      BeforeSuite(() => {});
      AfterSuite(() => {});

      Scenario("sample-scenario", async ({ I }) => {
        I.pass();
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].steps).toHaveLength(1);
  expect(groups).toHaveLength(4);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "\"before all\" hook: BeforeSuite for \"sample-scenario\"",
        befores: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
          }),
        ]),
        afters: [],
      }),
      expect.objectContaining({
        name: "\"before each\" hook: Before for \"sample-scenario\"",
        befores: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
          }),
        ]),
        afters: [],
      }),
      expect.objectContaining({
        name: "\"after each\" hook: After for \"sample-scenario\"",
        befores: [],
        afters: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
          }),
        ]),
      }),
      expect.objectContaining({
        name: "\"after all\" hook: AfterSuite for \"sample-scenario\"",
        befores: [],
        afters: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
          }),
        ]),
      }),
    ]),
  );
});
