import { expect, it } from "vitest";
import { Status, LinkType } from "allure-js-commons/sdk/node";
import { resolve } from "node:path";
import { runJasmineInlineTest } from "../../../utils";

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
  expect(tests[0].attachments).toHaveLength(1);

  const [attachment] = tests[0].attachments;

  expect(attachment.name).toBe("Request body");
  expect(Buffer.from(attachments[attachment.source] as string, "base64").toString("utf8")).toBe(
    JSON.stringify({ foo: "bar" }),
  );
});
