import { expect } from "@jest/globals";

import { runTests } from "./utils/run-tests";
test("simple scenarios", async () => {
  const res = await runTests({
    files: {
      "login.test.js": /* js */ `
      Feature("tags")
      Scenario('taggs', () => {
      }).tag('@slow')
        .tag('important')
        .tag('@allure.label.owner:eroshenkoam')
        .tag('@allure.label.layer:UI')
        .tag('@allure.id:228')
        .tag('@allure.label.story:aga')
        .tag('@allure.label.epic:aga')
        .tag('@allure.label.severity:critical');
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
        "value": "tags",
      },
      {
        "name": "tag",
        "value": "@slow",
      },
      {
        "name": "tag",
        "value": "@important",
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
        "name": "epic",
        "value": "aga",
      },
      {
        "name": "severity",
        "value": "critical",
      },
    ]
  `);
});
