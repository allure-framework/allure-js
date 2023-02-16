import { expect, test } from "./fixtures";

test("should report programmatically skipped results", async ({ runInlineTest }) => {
  const result = await runInlineTest(
    {
      "a.test.ts": `
      import test from '@playwright/test';
      test.skip('should be skipped 1', async () => {});
    `,
      "b.test.ts": `
      import test from '@playwright/test';
      test('should not be skipped', async () => {});
    `,
    },
    (writer) => {
      return writer.tests.map((val) => ({ status: val.status, fullName: val.fullName }));
    },
  );

  expect(result.length).toBe(2);
  expect(result).toEqual(
    expect.arrayContaining([
      {
        fullName: "a.test.ts#should be skipped 1",
        status: "skipped",
      },
      {
        fullName: "b.test.ts#should not be skipped",
        status: "passed",
      },
    ]),
  );
});
