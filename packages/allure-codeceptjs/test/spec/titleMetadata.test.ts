import { expect, it } from "vitest";
import { LabelName } from "allure-js-commons/sdk/node";
import { runCodeceptJsInlineTest } from "../utils";

it("handles title metadata", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "sample.test.js": `
        Feature("sample feature");
        Scenario("some strange name to test @allure.id=228 @allure.label.tag=slow @allure.label.labelName=labelValue", async () => {});
      `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].name).toEqual("some strange name to test");
  expect(tests[0].labels).toEqual(
    expect.arrayContaining([
      {
        name: LabelName.ALLURE_ID,
        value: "228",
      },
      {
        name: LabelName.TAG,
        value: "slow",
      },
      {
        name: "labelName",
        value: "labelValue",
      },
    ]),
  );
});
