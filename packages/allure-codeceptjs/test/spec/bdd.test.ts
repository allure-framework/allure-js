import { expect, it } from "vitest";
import { LabelName } from "allure-js-commons";
import { runCodeceptJsInlineTest } from "../utils.js";

it("should add correct bdd labels", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "login.test.js": `
      Feature("bdd")
      Scenario('bdd', () => {
      }).tag('@allure.label.epic:WebInterface')
        .tag('@allure.label.feature:EssentialFeatures')
        .tag('@allure.label.story:Authentication');
      `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toEqual(
    expect.arrayContaining([
      {
        name: LabelName.EPIC,
        value: "WebInterface",
      },
      {
        name: LabelName.FEATURE,
        value: "EssentialFeatures",
      },
      {
        name: LabelName.STORY,
        value: "Authentication",
      },
    ]),
  );

  expect(tests[0].labels.filter((l) => l.name === LabelName.EPIC)).toHaveLength(1);
  expect(tests[0].labels.filter((l) => l.name === LabelName.FEATURE)).toHaveLength(1);
  expect(tests[0].labels.filter((l) => l.name === LabelName.STORY)).toHaveLength(1);
});
