import { expect, it } from "vitest";
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

  expect(tests).toHaveLength(0);
});
