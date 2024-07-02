import { expect, it } from "vitest";
import { runPlaywrightInlineTest } from "../utils.js";

it("should set package label", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "some/path/to/sample.test.js": `
      import { test } from '@playwright/test';

      test('test 1', async () => {});
      `,
    "some/other/to/some.test.js": `
      import { test } from '@playwright/test';

      test('test 2', async () => {});
      `,
    "root.test.js": `
      import { test } from '@playwright/test';

      test('test 3', async () => {});
      `,
  });

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "test 1",
        labels: expect.arrayContaining([{ name: "package", value: "some.path.to.sample.test.js" }]),
      }),
      expect.objectContaining({
        name: "test 2",
        labels: expect.arrayContaining([{ name: "package", value: "some.other.to.some.test.js" }]),
      }),
      expect.objectContaining({
        name: "test 3",
        labels: expect.arrayContaining([{ name: "package", value: "root.test.js" }]),
      }),
    ]),
  );
});
