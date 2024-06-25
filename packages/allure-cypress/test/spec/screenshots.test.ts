import { expect, it } from "vitest";
import { type Attachment, ContentType, Status } from "allure-js-commons";
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
  expect(tests[0].steps).toHaveLength(1);
  expect(tests[0].steps).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: String.raw`Command "wrap"`,
        status: Status.FAILED,
        attachments: [
          expect.objectContaining({
            name: "Screenshot",
            type: ContentType.PNG,
          }),
        ],
      }),
    ]),
  );

  const [attachment] = tests[0].steps[0].attachments;

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
  expect(tests[0].steps).toHaveLength(1);
  expect(tests[0].steps).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: String.raw`Command "screenshot"`,
        attachments: [
          expect.objectContaining({
            name: "foo",
            type: ContentType.PNG,
          }),
        ],
      }),
    ]),
  );

  const [attachment] = tests[0].steps[0].attachments;

  expect(attachments).toHaveProperty((attachment as Attachment).source);
});
