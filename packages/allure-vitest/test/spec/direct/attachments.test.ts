import { expect, it } from "vitest";
import { runVitestInlineTest } from "../../utils.js";

it("adds attachments", async () => {
  const { tests, attachments } = await runVitestInlineTest(`
    import { test } from "vitest";
    import { attachment } from "allure-vitest";

    test("text attachment", async (t) => {
      await attachment(t, "foo.txt", Buffer.from("bar"), "text/plain");
    });
  `);

  expect(tests).toHaveLength(1);

  const [attachment] = tests[0].attachments;

  expect(attachment.name).toBe("foo.txt");
  expect(Buffer.from(attachments[attachment.source] as string, "base64").toString("utf8")).toBe("bar");
});
