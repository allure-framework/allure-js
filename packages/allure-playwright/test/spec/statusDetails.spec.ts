import { expect, it } from "vitest";
import { runPlaywrightInlineTest } from "../utils";

it("reports test status details", async () => {
  const { tests } = await runPlaywrightInlineTest(
    `
      import { test, expect } from '@playwright/test';
      test('should fail', async ({}) => {
        expect(true).toBe(false);
      });
    `,
    {
      detail: false,
    },
  );

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        statusDetails: expect.objectContaining({
          message: expect.stringContaining("Object.is equality"),
          trace: expect.stringMatching(/\s*at\s/),
        }),
      }),
    ]),
  );
});
