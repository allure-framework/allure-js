import { expect, test } from "./fixtures";

test("should have custom environment", async ({ runInlineTest }) => {
  const result = await runInlineTest(
    {
      "a.test.ts": `
        import { test, expect } from '@playwright/test';
        import { allure, LabelName } from '../../dist/index'
        test('should add custom environment info', async ({}, testInfo) => {
            allure.environment({user: 'custom_user', undefinedValue: ""});
        });
      `,
    },
    (writer) => {
      return writer.envInfo;
    },
  );
  expect(result).toEqual({ undefinedValue: "", user: "custom_user" });
});

test("should have process environment", async ({ runInlineTest }) => {
  const result = await runInlineTest(
    {
      "a.test.ts": `
        import { test, expect } from '@playwright/test';
        import { allure, LabelName } from '../../dist/index'
        test('should add custom environment info', async ({}, testInfo) => {
            allure.environment();
        });
      `,
    },
    (writer) => {
      return writer.envInfo;
    },
  );
  // process.env is executed for subprocesses. Subprocess can modify parent process.env so we can check only keys
  expect(result.PATH).toEqual(process.env.PATH);
});
