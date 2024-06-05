/* eslint  @typescript-eslint/no-require-imports: off */
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { runJasmineInlineTest } from "../../../utils.js";

it("handles json attachment", async () => {
  const { tests, attachments } = await runJasmineInlineTest({
    "spec/test/sample.spec.js": `
    const { allure } = require("../helpers/allure");

    it("json", async () => {
      await allure.attachment("Request body", JSON.stringify({ foo: "bar" }), "application/json");
    });
  `,
    "spec/helpers/allure.js": require(resolve(__dirname, "../../../fixtures/spec/helpers/legacy/allure.cjs")),
  });

  expect(tests).toHaveLength(1);

  const [step] = tests[0].steps;
  expect(step.name).toBe("Request body");
  const [attachment] = step.attachments;

  expect(attachment.name).toBe("Request body");
  expect(Buffer.from(attachments[attachment.source] as string, "base64").toString("utf8")).toBe(
    JSON.stringify({ foo: "bar" }),
  );
});
