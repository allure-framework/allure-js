import { expect } from "@jest/globals";

import { runTests } from "./utils/run-tests";

test("simple scenarios", async () => {
  const res = await runTests({
    files: {
      "login.test.js": `
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
    Array [
      Object {
        "name": "language",
        "value": "javascript",
      },
      Object {
        "name": "framework",
        "value": "codeceptjs",
      },
      Object {
        "name": "suite",
        "value": "login-feature",
      },
      Object {
        "name": "name",
        "value": "value",
      },
      Object {
        "name": "tag",
        "value": "tag1",
      },
      Object {
        "name": "tag",
        "value": "tag2",
      },
      Object {
        "name": "tag",
        "value": "tag3",
      },
      Object {
        "name": "owner",
        "value": "eroshenkoam",
      },
      Object {
        "name": "layer",
        "value": "UI",
      },
      Object {
        "name": "ALLURE_ID",
        "value": "228",
      },
      Object {
        "name": "story",
        "value": "aga",
      },
      Object {
        "name": "feature",
        "value": "aga",
      },
      Object {
        "name": "epic",
        "value": "aga",
      },
      Object {
        "name": "epic",
        "value": "severity",
      },
    ]
  `);
});
