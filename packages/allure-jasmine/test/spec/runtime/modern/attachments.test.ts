import { expect, it } from "vitest";
import { runJasmineInlineTest } from "../../../utils.js";

it("handles json attachment", async () => {
  const { tests, attachments } = await runJasmineInlineTest({
    "spec/test/sample.spec.js": `
    const { attachment } = require("allure-js-commons");

    it("json", async () => {
      await attachment("Request body", JSON.stringify({ foo: "bar" }), "application/json");
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].attachments).toHaveLength(1);

  const [attachment] = tests[0].attachments;

  expect(attachment.name).toBe("Request body");
  expect(Buffer.from(attachments[attachment.source] as string, "base64").toString("utf8")).toBe(
    JSON.stringify({ foo: "bar" }),
  );
});
