import { expect, it } from "vitest";
import { runCypressInlineTest } from "../utils";

it("historyId", async () => {
  const { tests } = await runCypressInlineTest(`
    import { historyId } from "allure-cypress";

    it("sample", () => {
      historyId("foo");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].historyId).toBe("foo");
});
