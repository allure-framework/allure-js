import { expect, test } from "./fixtures";

test("should have metadata from title", async ({ runInlineTest }) => {
  const results = await runInlineTest({
    "a.test.ts": /* ts */ `
      import { test } from '@playwright/test';
      import { allure } from '../../dist/index'
      test('some strange name to test @allure.id=228 @allure.label.tag=slow @allure.label.labelName=labelValue', async ({}, testInfo) => {
      });
      `,
  });

  expect(results.tests).toEqual([
    expect.objectContaining({
      labels: expect.arrayContaining([
        { name: "ALLURE_ID", value: "228" },
        { name: "tag", value: "slow" },
        { name: "labelName", value: "labelValue" },
      ]),
    }),
  ]);

  expect(results.tests[0].name).toBe("some strange name to test");
});

test("multiline name", async ({ runInlineTest }) => {
  const results = await runInlineTest({
    "a.test.ts": /* ts */ `
      import { test } from '@playwright/test';
      import { allure } from '../../dist/index'
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

  expect(results.tests[0].name).toBe("some strange name to test \nsomething else in name   some word");
});
