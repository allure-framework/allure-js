import { expect, test } from "./fixtures";

test("should report tests even if global setup fails", async ({ runInlineTest }) => {
  const result = await runInlineTest(
    {
      "a.test.ts": `
      import test from '@playwright/test';
      test('should be skipped 1', async () => {});
    `,
      "b.test.ts": `
      import test from '@playwright/test';
      test('should be skipped 2', async () => {});
    `,
      "global-fail.ts": `
      export default function throwingScript() {
        throw new Error("test");
      }
    `,
      "playwright.config.ts": `
        module.exports = {
          projects: [{ name: 'project' }],
          reporter: [[require.resolve("../../dist/index.js")]],
          globalSetup: "./global-fail.ts"
       };
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
        fullName: "b.test.ts#should be skipped 2",
        status: "skipped",
      },
    ]),
  );
});
