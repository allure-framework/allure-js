import { expect, it } from "vitest";
import { Status } from "allure-js-commons";
import { runCodeceptJsInlineTest } from "../utils.js";

it("doesn't report skipped features and steps", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "skipped_feature1.test.js": `
      xFeature("logout-feature1");
      Scenario("logout-scenario1", async () => {});
    `,
    "skipped_feature2.test.js": `
      Feature.skip("logout-feature2");
      Scenario("logout-scenario1", async () => {});
    `,
    "skipped_scenario1.test.js": `
      Feature("logout-feature3");
      xScenario("logout-scenario1", async () => {});
    `,
    "skipped_scenario2.test.js": `
      Feature("logout-feature4");
      Scenario.skip("logout-scenario1", async () => {});
    `,
  });

  expect(tests).toHaveLength(4);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        fullName: "dummy:skipped_feature1.test.js: logout-feature1 > logout-scenario1",
        name: "logout-scenario1",
        status: Status.SKIPPED,
        statusDetails: expect.objectContaining({
          message: "Test skipped",
        }),
      }),
      expect.objectContaining({
        fullName: "dummy:skipped_feature2.test.js: logout-feature2 > logout-scenario1",
        name: "logout-scenario1",
        status: Status.SKIPPED,
        statusDetails: expect.objectContaining({
          message: "Test skipped",
        }),
      }),
      expect.objectContaining({
        fullName: "dummy:skipped_scenario1.test.js: logout-feature3 > logout-scenario1",
        name: "logout-scenario1",
        status: Status.SKIPPED,
        statusDetails: expect.objectContaining({
          message: "Test skipped",
        }),
      }),
      expect.objectContaining({
        fullName: "dummy:skipped_scenario2.test.js: logout-feature4 > logout-scenario1",
        name: "logout-scenario1",
        status: Status.SKIPPED,
        statusDetails: expect.objectContaining({
          message: "Test skipped",
        }),
      }),
    ]),
  );
});
