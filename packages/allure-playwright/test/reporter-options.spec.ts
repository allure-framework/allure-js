import { LabelName } from "allure-js-commons";
import { expect, test } from "./fixtures";

const testFile = {
  "a.test.ts": /* ts */ `
    import test from '@playwright/test';

    test.beforeEach(() => {
        console.log("This is the beforeEach hook");
    });

    test('my test', async () => {});

    test.afterEach(() => {
        console.log("This is the afterEach hook");
    });
  `,
};

const suiteTitle = {
  labels: expect.arrayContaining([{ name: LabelName.SUITE, value: "a.test.ts" }]),
};

const detailSteps = {
  steps: [
    expect.objectContaining({ name: "Before Hooks", status: "passed" }),
    expect.objectContaining({ name: "After Hooks", status: "passed" }),
  ],
};

test.describe("reporter options", () => {
  test("default options should include detail and suiteTitle", async ({ runInlineTest }) => {
    const results = await runInlineTest({
      ...testFile,
      reporterOptions: JSON.stringify({}),
    });

    expect(results.tests).toEqual(
      expect.arrayContaining([
        expect.objectContaining(suiteTitle),
        expect.objectContaining(detailSteps),
      ]),
    );
  });

  test("detail and suiteTitle true", async ({ runInlineTest }) => {
    const results = await runInlineTest({
      ...testFile,
      reporterOptions: JSON.stringify({
        detail: true,
        suiteTitle: true,
      }),
    });

    expect(results.tests).toEqual(
      expect.arrayContaining([
        expect.objectContaining(suiteTitle),
        expect.objectContaining(detailSteps),
      ]),
    );
  });

  test("detail and suiteTitle false", async ({ runInlineTest }) => {
    const results = await runInlineTest({
      ...testFile,
      reporterOptions: JSON.stringify({
        detail: false,
        suiteTitle: false,
      }),
    });

    expect(results.tests).not.toEqual(
      expect.arrayContaining([expect.objectContaining(suiteTitle)]),
    );

    expect(results.tests).not.toEqual(
      expect.arrayContaining([expect.objectContaining(detailSteps)]),
    );
  });
});
