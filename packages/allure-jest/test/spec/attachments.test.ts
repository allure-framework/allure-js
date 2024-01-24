import { expect, it } from "@jest/globals";
import { runJestInlineTest } from "../utils";

it("handles nameless attachments", async () => {
  const { tests, attachments } = await runJestInlineTest(`
    it("json", () => {
      allure.attachment(JSON.stringify({ foo: "bar" }), "application/json");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].attachments).toHaveLength(1);

  const [attachment] = tests[0].attachments;

  expect(attachment.name).toBe("Attachment");
  expect(Buffer.from(attachments[attachment.source] as string, "base64").toString("utf8")).toBe(
    JSON.stringify({ foo: "bar" }),
  );
});

it("handles attachments with name", async () => {
  const { tests, attachments } = await runJestInlineTest(`
    it("json", () => {
      allure.attachment(JSON.stringify({ foo: "bar" }), "application/json", "Request body");
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
