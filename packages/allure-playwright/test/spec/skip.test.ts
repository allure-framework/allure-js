import { expect, test } from "./fixtures";

test("should report programmatically skipped results", async ({ runInlineTest }) => {
  const results = await runInlineTest({
    "a.test.ts": /* ts */ `
      import test from '@playwright/test';
      test.skip('should be skipped 1', async () => {});
    `,
    "b.test.ts": /* ts */ `
      import test from '@playwright/test';
      test('should not be skipped', async () => {});
    `,
  });

  expect(results.tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        fullName: "a.test.ts#should be skipped 1",
        status: "skipped",
      }),
      expect.objectContaining({
        fullName: "b.test.ts#should not be skipped",
        status: "passed",
      }),
    ]),
  );
});
