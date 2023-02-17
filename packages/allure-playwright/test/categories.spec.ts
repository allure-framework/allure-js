/* eslint-disable quote-props */
import { Status } from "allure-js-commons";
import { expect, test } from "./fixtures";

test("should have categories", async ({ runInlineTest }) => {
  const categories: Record<string, string | undefined> | undefined = await runInlineTest(
    {
      "a.test.ts": `
       import { test, expect } from '@playwright/test';
       import { allure, LabelName,Status } from '../../dist/index'
       test('should add epic label', async ({}, testInfo) => {
       });
     `,
      reporterOptions: JSON.stringify({
        categories: [
          {
            name: "Sad tests",
            messageRegex: ".*Sad.*",
            matchedStatuses: [Status.FAILED],
          },
          {
            name: "Infrastructure problems",
            messageRegex: ".*RuntimeException.*",
            matchedStatuses: [Status.BROKEN],
          },
          {
            name: "Outdated tests",
            messageRegex: ".*FileNotFound.*",
            matchedStatuses: [Status.BROKEN],
          },
          {
            name: "Regression",
            messageRegex: ".*\\sException:.*",
            matchedStatuses: [Status.BROKEN],
          },
        ],
      }),
    },
    (writer) => {
      return writer.categories;
    },
  );

  expect(categories).toEqual([
    {
      name: "Sad tests",
      messageRegex: ".*Sad.*",
      matchedStatuses: [Status.FAILED],
    },
    {
      name: "Infrastructure problems",
      messageRegex: ".*RuntimeException.*",
      matchedStatuses: [Status.BROKEN],
    },
    {
      name: "Outdated tests",
      messageRegex: ".*FileNotFound.*",
      matchedStatuses: [Status.BROKEN],
    },
    {
      name: "Regression",
      messageRegex: ".*\\sException:.*",
      matchedStatuses: [Status.BROKEN],
    },
  ]);
});
