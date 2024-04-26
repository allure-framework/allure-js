import { expect, it } from "vitest";
import { runCodeceptJSInlineTest } from "../utils";

it("doesn't report skipped features and steps", async () => {
  const { tests } = await runCodeceptJSInlineTest({
    "skipped_feature1.test.js": `
      xFeature("logout-feature");
      Scenario("logout-scenario1", async () => {});
    `,
    "skipped_feature2.test.js": `
      Feature.skip("logout-feature");
      Scenario("logout-scenario1", async () => {});
    `,
    "skipped_scenario1.test.js": `
      Feature("logout-feature");
      xScenario("logout-scenario1", async () => {});
    `,
    "skipped_scenario2.test.js": `
      Feature("logout-feature");
      Scenario.skip("logout-scenario1", async () => {});
    `,
  });

  expect(tests).toHaveLength(0);
});
