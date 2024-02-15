import { expect, it } from "vitest";
import { LabelName } from "allure-js-commons";
import { runVitestInlineTest } from "../../utils.js";

it("adds check thread and hostname", async () => {
  const { tests } = await runVitestInlineTest(`
    import { test } from "vitest";
    import { attachment } from "allure-vitest";

    function sleep(milliseconds) {
      return new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
      });
    }

    test("text attachment", async (t) => {
      await sleep(10);
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toContainEqual({ name: LabelName.HOST, value: expect.any(String) });
  expect(tests[0].labels).toContainEqual({ name: LabelName.THREAD, value: expect.any(String) });
  expect(tests[0].start || 0).toBeLessThan(tests[0].stop || 0);
});
