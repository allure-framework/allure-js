import { expect } from "expect";
import { it } from "mocha";
import { runTests } from "./utils/run-tests";

it("simple scenarios", async () => {
  const res = await runTests(
    {
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
    },
    "codecept-tags.test.ts",
  );

  const labels = res.tests[0].labels;
  expect(labels).toEqual(
    expect.arrayContaining([
      {
        name: "language",
        value: "javascript",
      },
      {
        name: "framework",
        value: "codeceptjs",
      },
      {
        name: "suite",
        value: "tags",
      },
      {
        name: "tag",
        value: "@slow",
      },
      {
        name: "tag",
        value: "@important",
      },
      {
        name: "owner",
        value: "eroshenkoam",
      },
      {
        name: "layer",
        value: "UI",
      },
      {
        name: "ALLURE_ID",
        value: "228",
      },
      {
        name: "story",
        value: "aga",
      },
      {
        name: "epic",
        value: "aga",
      },
      {
        name: "severity",
        value: "critical",
      },
    ]),
  );
});
