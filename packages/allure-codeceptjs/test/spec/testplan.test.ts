import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import type { TestPlanV1 } from "allure-js-commons/sdk";
import { runCodeceptJsInlineTest } from "../utils.js";

it("should support test plan", async () => {
  const exampleTestPlan: TestPlanV1 = {
    version: "1.0",
    tests: [
      {
        id: 321,
        selector: "invalid",
      },
      {
        selector: "dummy:nested/login.test.js: login-feature > login-scenario1",
      },
      {
        selector: "dummy:logout.test.js: logout-feature > logout-scenario1",
      },
    ],
  };

  const testPlanFilename = "example-testplan.json";
  const { tests } = await runCodeceptJsInlineTest(
    {
      "nested/login.test.js": `
        Feature("login-feature");
        Scenario("login-scenario1", async () => {});
        Scenario("login-scenario2", async () => {});
        Scenario("login-scenario3", async () => {}).tag("@allure.id:321");
      `,
      "logout.test.js": `
        Feature("logout-feature");
        Scenario("logout-scenario1", async () => {});
        Scenario("logout-scenario2", async () => {});
      `,
      [testPlanFilename]: `${JSON.stringify(exampleTestPlan)}`,
    },
    {
      env: { ALLURE_TESTPLAN_PATH: `./${testPlanFilename}` },
    },
  );

  expect(tests).toHaveLength(3);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: Status.PASSED,
        name: "logout-scenario1",
        fullName: "dummy:logout.test.js: logout-feature > logout-scenario1",
      }),
      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        name: "login-scenario1",
        fullName: "dummy:nested/login.test.js: login-feature > login-scenario1",
      }),
      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        name: "login-scenario3",
        fullName: "dummy:nested/login.test.js: login-feature > login-scenario3 @allure.id:321",
      }),
    ]),
  );
});
