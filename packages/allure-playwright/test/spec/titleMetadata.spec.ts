import { expect, it } from "vitest";
import { LabelName } from "allure-js-commons";
import { runPlaywrightInlineTest } from "../utils.js";

it("has metadata from title", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test } from '@playwright/test';

      test('some strange name to test @allure.id=228 @allure.label.tag=slow @allure.label.labelName=labelValue', async ({}, testInfo) => {
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests).toEqual([
    expect.objectContaining({
      name: "some strange name to test",
      labels: expect.arrayContaining([
        { name: LabelName.ALLURE_ID, value: "228" },
        { name: LabelName.TAG, value: "slow" },
        { name: "labelName", value: "labelValue" },
      ]),
    }),
  ]);
});

it("supports multiline name", async () => {
  const results = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test } from '@playwright/test';

      test(
        \`some strange name to test @allure.label.l1=v1
something else in name @allure.label.l2=v2 @allure.label.l3=v3 some word\`, async ({}, testInfo) => {
      });
    `,
  });

  expect(results.tests).toEqual([
    expect.objectContaining({
      labels: expect.arrayContaining([
        { name: "l1", value: "v1" },
        { name: "l2", value: "v2" },
        { name: "l3", value: "v3" },
      ]),
    }),
  ]);

  expect(results.tests[0].name).toBe("some strange name to test\nsomething else in name some word");
});
