import { expect } from "@jest/globals";

import { runTests } from "./utils/run-tests";
test("simple scenarios", async () => {
  const res = await runTests({
    files: {
      "login.test.js": /* js */ `
      Feature("tags")
      Scenario('taggs', () => {
      }).tag('@slow').tag('important');
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
    ]
  `);
});
