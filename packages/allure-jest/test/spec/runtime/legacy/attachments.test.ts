import { expect, it } from "vitest";
import { runJestInlineTest } from "../../../utils";

it("handles json attachment", async () => {
  const { tests, attachments } = await runJestInlineTest(`
    it("json", async () => {
      await allure.attachment("Request body", JSON.stringify({ foo: "bar" }), "application/json");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].attachments).toHaveLength(1);

  const [attachment] = tests[0].attachments;

  expect(attachment.name).toBe("Request body");
  expect(Buffer.from(attachments[attachment.source] as string, "base64").toString("utf8")).toBe(
    JSON.stringify({ foo: "bar" }),
  );
});
