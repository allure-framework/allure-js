import { expect, it } from "vitest";
import { runVitestInlineTest } from "../../../utils.js";

it("adds attachments", async () => {
  const { tests, attachments } = await runVitestInlineTest({
    "sample.test.ts": `
    import { test } from "vitest";
    import { attachment } from "allure-js-commons";

    test("text attachment", async () => {
      await attachment("foo.txt", Buffer.from("bar"), "text/plain");
    });
  `,
  });

  expect(tests).toHaveLength(1);
  const [step] = tests[0].steps;
  expect(step.name).toBe("foo.txt");

  const [attachment] = step.attachments;

  expect(attachment.name).toBe("foo.txt");
  expect(Buffer.from(attachments[attachment.source] as string, "base64").toString("utf8")).toBe("bar");
});
