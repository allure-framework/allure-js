import { expect } from "@jest/globals";

import { runTests } from "./utils/run-tests";

test("simple scenarios", async () => {
  const res = await runTests({
    files: {
      "login.test.js": `
        Feature("login-feature");
        Scenario("login-scenario1", async () => {
          codeceptjs.container.plugins("allure").label("name", "value");
          codeceptjs.container.plugins("allure").tag("tag1");
          codeceptjs.container.plugins("allure").tags("tag2", "tag3");
          codeceptjs.container.plugins("allure").issue("issueName", "google.com");
          codeceptjs.container.plugins("allure").owner("eroshenkoam");
          codeceptjs.container.plugins("allure").layer("UI");
          codeceptjs.container.plugins("allure").id("228");
          codeceptjs.container.plugins("allure").description("aga");
          codeceptjs.container.plugins("allure").story("aga");
          codeceptjs.container.plugins("allure").feature("aga");
          codeceptjs.container.plugins("allure").epic("aga");
          codeceptjs.container.plugins("allure").epic("severity");
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
