import { Stage, Status } from "allure-js-commons";
import type { TestPlanV1 } from "allure-js-commons/sdk";
import { expect, it } from "vitest";

import { runCodeceptJsInlineTest } from "../utils.js";

it("applies a test plan with excluded tests only", async () => {
  const { tests } = await runCodeceptJsInlineTest(
    {
      "sample.test.js": `
        Feature("feature");
        Scenario("excluded test", () => { throw new Error("excluded body executed"); }).tag("@allure.id:77");
        Scenario("survivor", () => {}).tag("@allure.id:78");
      `,
      "testplan.json": JSON.stringify({ version: "1.0", excludedTests: [{ id: 77 }] }),
    },
    { env: { ALLURE_TESTPLAN_PATH: "./testplan.json" } },
  );

  expect(tests).toEqual([expect.objectContaining({ name: "survivor", status: "passed" })]);
});

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
