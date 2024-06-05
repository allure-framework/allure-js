import { expect, it } from "vitest";
import { type Attachment, ContentType } from "allure-js-commons";
import { runCypressInlineTest } from "../utils.js";

it("attaches screenshots for failed specs", async () => {
  const { tests, attachments } = await runCypressInlineTest(
    () => `
    it("failed", () => {
      cy.wrap(1).should("eq", 2);
    });
  `,
  );

  expect(tests).toHaveLength(1);
  expect(tests[0].attachments).toHaveLength(1);

  const [attachment] = tests[0].attachments;

  expect(attachment.name).toBe("Screenshot");
  expect(attachment.type).toBe(ContentType.PNG);
  expect(attachments).toHaveProperty((attachment as Attachment).source);
});

it("attaches runtime screenshots", async () => {
  const { tests, attachments } = await runCypressInlineTest(
    () => `
    it("manual", () => {
      cy.screenshot("foo");
    });
  `,
  );

  expect(tests).toHaveLength(1);
  expect(tests[0].attachments).toHaveLength(1);

  const [attachment] = tests[0].attachments;

  expect(attachment.name).toBe("foo");
  expect(attachment.type).toBe(ContentType.PNG);
  expect(attachments).toHaveProperty((attachment as Attachment).source);
});
