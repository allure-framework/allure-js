import { resolve } from "node:path";
import { expect, it } from "vitest";
import { runJasmineInlineTest } from "../../../utils";

it("sets historyId", async () => {
  const { tests } = await runJasmineInlineTest({
    "spec/test/sample.spec.js": `
      const { allure } = require("../helpers/allure");

      it("historyId", async () => {
        await allure.historyId("foo");
      })
    `,
    "spec/helpers/allure.js": require(resolve(__dirname, "../../../fixtures/spec/helpers/legacy/allure.cjs")),
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].historyId).toBe("foo");
});
