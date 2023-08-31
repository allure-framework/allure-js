import { expect } from "@jest/globals";

import { runTests } from "./utils/run-tests";

test("simple scenarios", async () => {
  const res = await runTests({
    files: {
      "login.test.js": /* js */ `
        Feature("login-feature");
        Scenario("login-scenario1", async () => {
          const allure = codeceptjs.container.plugins("allure");
          allure.label("name", "value");
          allure.tag("tag1");
          allure.tags("tag2", "tag3");
          allure.issue("issueName", "example.org");
          allure.owner("eroshenkoam");
          allure.layer("UI");
          allure.id("228");
          allure.description("aga");
          allure.story("aga");
          allure.feature("aga");
          allure.epic("aga");
          allure.epic("severity");
        });
      `,
    },
  });
  expect(res.tests[0]!.labels).toMatchInlineSnapshot(`
    [
      {
        "name": "language",
        "value": "javascript",
      },
      {
        "name": "framework",
        "value": "codeceptjs",
      },
      {
        "name": "suite",
        "value": "login-feature",
      },
      {
        "name": "name",
        "value": "value",
      },
      {
        "name": "tag",
        "value": "tag1",
      },
      {
        "name": "tag",
        "value": "tag2",
      },
      {
        "name": "tag",
        "value": "tag3",
      },
      {
        "name": "owner",
        "value": "eroshenkoam",
      },
      {
        "name": "layer",
        "value": "UI",
      },
      {
        "name": "ALLURE_ID",
        "value": "228",
      },
      {
        "name": "story",
        "value": "aga",
      },
      {
        "name": "feature",
        "value": "aga",
      },
      {
        "name": "epic",
        "value": "aga",
      },
      {
        "name": "epic",
        "value": "severity",
      },
    ]
  `);
});
