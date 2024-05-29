import { expect, it } from "vitest";
import { LabelName } from "allure-js-commons";
import { runCodeceptJsInlineTest } from "../utils";

it("supports codecept tags", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "login.test.js": `
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
  });

  expect(tests).toHaveLength(1);
  expect(tests[0]).toEqual(
    expect.objectContaining({
      labels: expect.arrayContaining([
        {
          name: LabelName.TAG,
          value: "@slow",
        },
        {
          name: LabelName.TAG,
          value: "@important",
        },
        {
          name: LabelName.OWNER,
          value: "eroshenkoam",
        },
        {
          name: LabelName.LAYER,
          value: "UI",
        },
        {
          name: LabelName.ALLURE_ID,
          value: "228",
        },
        {
          name: LabelName.STORY,
          value: "aga",
        },
        {
          name: LabelName.EPIC,
          value: "aga",
        },
        {
          name: LabelName.SEVERITY,
          value: "critical",
        },
        {
          name: LabelName.LANGUAGE,
          value: "javascript",
        },
        {
          name: LabelName.FRAMEWORK,
          value: "codeceptjs",
        },
        {
          name: LabelName.SUITE,
          value: "tags",
        },
      ]),
    }),
  );
});
