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

      BeforeSuite(() => {});
      AfterSuite(() => {});

      Scenario("sample-scenario", async ({ I }) => {
        I.pass();
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].steps).toHaveLength(1);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: String.raw`"before all" hook: codeceptjs.beforeSuite`,
        befores: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            name: String.raw`"before all" hook: codeceptjs.beforeSuite`,
          }),
        ]),
        afters: [],
      }),
      expect.objectContaining({
        name: String.raw`"before all" hook`,
        befores: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            name: String.raw`"before all" hook`,
          }),
        ]),
        afters: [],
      }),
      expect.objectContaining({
        name: String.raw`"before all" hook: BeforeSuite`,
        befores: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            name: String.raw`"before all" hook: BeforeSuite`,
          }),
        ]),
        afters: [],
      }),
      expect.objectContaining({
        name: String.raw`"before each" hook: codeceptjs.before`,
        befores: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            name: String.raw`"before each" hook: codeceptjs.before`,
          }),
        ]),
        afters: [],
      }),
      expect.objectContaining({
        name: String.raw`"before each" hook: Before`,
        befores: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            name: String.raw`"before each" hook: Before`,
          }),
        ]),
        afters: [],
      }),
      expect.objectContaining({
        name: String.raw`"after each" hook: After`,
        befores: [],
        afters: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            name: String.raw`"after each" hook: After`,
          }),
        ]),
      }),
      expect.objectContaining({
        name: String.raw`"after each" hook: finalize codeceptjs`,
        befores: [],
        afters: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            name: String.raw`"after each" hook: finalize codeceptjs`,
          }),
        ]),
      }),
      expect.objectContaining({
        name: String.raw`"after all" hook`,
        befores: [],
        afters: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            name: String.raw`"after all" hook`,
          }),
        ]),
      }),
      expect.objectContaining({
        name: String.raw`"after all" hook: AfterSuite`,
        befores: [],
        afters: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            name: String.raw`"after all" hook: AfterSuite`,
          }),
        ]),
      }),
      expect.objectContaining({
        name: String.raw`"after all" hook: codeceptjs.afterSuite`,
        befores: [],
        afters: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            name: String.raw`"after all" hook: codeceptjs.afterSuite`,
          }),
        ]),
      }),
    ]),
  );
});

it("should support steps in before & after hooks", async () => {
  const { tests, groups } = await runCodeceptJsInlineTest({
    "sample.test.js": `
      const { step } = require("allure-js-commons");

      Feature("sample-feature");

      Before(async () => {
        await step("Before step 1", () => {});
        await step("Before step 2", () => {});
      });
      After(async () => {
        await step("After step 1", () => {});
        await step("After step 2", () => {});
        await step("After step 3", () => {});
      });

      Scenario("sample-scenario", async ({ I }) => {
        I.pass();
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].steps).toHaveLength(1);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: String.raw`"before each" hook: Before`,
        befores: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            steps: expect.arrayContaining([
              expect.objectContaining({
                name: "Before step 1",
                status: Status.PASSED,
              }),
              expect.objectContaining({
                name: "Before step 2",
                status: Status.PASSED,
              }),
            ]),
          }),
        ]),
        afters: [],
      }),
      expect.objectContaining({
        name: String.raw`"after each" hook: After`,
        befores: [],
        afters: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            steps: expect.arrayContaining([
              expect.objectContaining({
                name: "After step 1",
                status: Status.PASSED,
              }),
              expect.objectContaining({
                name: "After step 2",
                status: Status.PASSED,
              }),
              expect.objectContaining({
                name: "After step 3",
                status: Status.PASSED,
              }),
            ]),
          }),
        ]),
      }),
    ]),
  );
});
