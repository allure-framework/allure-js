import { expect, it } from "vitest";
import { runJestInlineTest } from "../../../utils.js";

it("handles json attachment", async () => {
  const { tests, attachments } = await runJestInlineTest(`
    it("json", async () => {
      await allure.attachment("Request body", JSON.stringify({ foo: "bar" }), "application/json");
    });
  `);

  expect(tests).toHaveLength(1);

  const [step] = tests[0].steps;
  expect(step.name).toBe("Request body");

  const [attachment] = step.attachments;

  expect(attachment.name).toBe("Request body");
  expect(Buffer.from(attachments[attachment.source] as string, "base64").toString("utf8")).toBe(
    JSON.stringify({ foo: "bar" }),
  );
});
