import { expect, it } from "vitest";
import { resolve } from "node:path";
import { runJasmineInlineTest } from "../../../utils";

it("sets description", async () => {
  const { tests } = await runJasmineInlineTest({
    "spec/test/sample.spec.js": `
      const { allure } = require("../helpers/allure");

      it("description", async () => {
        await allure.description("foo");
      })
    `,
    "spec/helpers/allure.js": require(resolve(__dirname, "../../../fixtures/spec/helpers/legacy/allure.cjs")),
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].description).toBe("foo");
});

it("sets html description", async () => {
  const { tests } = await runJasmineInlineTest({
    "spec/test/sample.spec.js": `
      const { allure } = require("../helpers/allure");

      it("descriptionHtml", async () => {
        await allure.descriptionHtml("foo");
      })
    `,
    "spec/helpers/allure.js": require(resolve(__dirname, "../../../fixtures/spec/helpers/legacy/allure.cjs")),
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].descriptionHtml).toBe("foo");
});
