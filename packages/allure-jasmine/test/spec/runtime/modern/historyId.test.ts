import { expect, it } from "vitest";
import { runJasmineInlineTest } from "../../../utils";

it("sets historyId", async () => {
  const { tests } = await runJasmineInlineTest({
    "spec/test/sample.spec.js": `
      const { historyId } = require("allure-js-commons");

      it("historyId", async () => {
        await historyId("foo");
      })
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].historyId).toBe("foo");
});
