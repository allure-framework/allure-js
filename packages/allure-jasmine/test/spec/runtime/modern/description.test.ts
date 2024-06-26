import { expect, it } from "vitest";
import { runJasmineInlineTest } from "../../../utils.js";

it("sets description", async () => {
  const { tests } = await runJasmineInlineTest({
    "spec/test/sample.spec.js": `
      const { description } = require("allure-js-commons");

      it("description", async () => {
        await description("foo");
      })
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].description).toBe("foo");
});

it("sets html description", async () => {
  const { tests } = await runJasmineInlineTest({
    "spec/test/sample.spec.js": `
      const { descriptionHtml } = require("allure-js-commons");

      it("descriptionHtml", async () => {
        await descriptionHtml("foo");
      })
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].descriptionHtml).toBe("foo");
});
