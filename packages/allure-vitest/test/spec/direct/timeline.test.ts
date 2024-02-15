import { expect, it } from "vitest";
import { LabelName } from "allure-js-commons";
import { runVitestInlineTest } from "../../utils.js";

it("adds check thread and hostname", async () => {
  const { tests } = await runVitestInlineTest(`
    import { test } from "vitest";
    import { attachment } from "allure-vitest";

    test("text attachment", async (t) => {});
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toContainEqual({ name: LabelName.HOST, value: expect.any(String) });
  expect(tests[0].labels).toContainEqual({ name: LabelName.THREAD, value: expect.any(String) });
});
