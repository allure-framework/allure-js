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
        .tag('@allure.label.severity:critical')
        .tag('@allure.issue:FOO-123')
        .tag('@allure.tms:TEST-123')
        ;
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
        "value": "tags",
      },
      Object {
        "name": "tag",
        "value": "@slow",
      },
      Object {
        "name": "tag",
        "value": "@important",
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
        "name": "epic",
        "value": "aga",
      },
      Object {
        "name": "severity",
        "value": "critical",
      },
    ]
  `);

  expect(res.tests[0]!.links).toMatchInlineSnapshot(`
  Array [
    Object {
      "name": "FOO-123",
      "type": "issue",
      "url": "https://example.qameta.io/allure-framework/allure-js/issues/FOO-123",
    },
    Object {
      "name": "TEST-123",
      "type": "tms",
      "url": "https://example.qameta.io/allure-framework/allure-js/tests/TEST-123",
    },
  ]
  `);
});
