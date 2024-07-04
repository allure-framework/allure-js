import { expect, it } from "vitest";
import { runJestInlineTest } from "../../../utils.js";

it("handles json attachment", async () => {
  const { tests, attachments } = await runJestInlineTest({
    "sample.test.js": `
    const { attachment } = require("allure-js-commons");

    it("json", async () => {
      await attachment("Request body", JSON.stringify({ foo: "bar" }), "application/json");
    });
  `,
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

it("adds steps to fixtures", async () => {
  const { tests, groups } = await runJestInlineTest({
    "sample.test.js": `
      const { attachment } = require("allure-js-commons");

      beforeEach(async () => {
        await attachment("Request body", JSON.stringify({ foo: "bar" }), "application/json");
      });

      afterEach(async () => {
        await attachment("Request body", JSON.stringify({ foo: "bar" }), "application/json");
      });

      it("step", async () => {});
    `,
  });

  expect(tests).toHaveLength(1);
  expect(groups).toHaveLength(2);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        befores: [
          expect.objectContaining({
            name: "beforeEach",
            steps: [
              expect.objectContaining({
                name: "Request body",
                attachments: [
                  expect.objectContaining({
                    name: "Request body",
                  }),
                ],
              }),
            ],
          }),
        ],
        afters: [],
      }),
      expect.objectContaining({
        befores: [],
        afters: [
          expect.objectContaining({
            name: "afterEach",
            steps: [
              expect.objectContaining({
                name: "Request body",
                attachments: [
                  expect.objectContaining({
                    name: "Request body",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ]),
  );
});
