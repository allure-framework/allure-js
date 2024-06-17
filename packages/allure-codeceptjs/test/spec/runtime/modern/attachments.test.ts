import { expect, it } from "vitest";
import { runCodeceptJsInlineTest } from "../../../utils.js";

it("handles attachments in tests", async () => {
  const { tests, attachments } = await runCodeceptJsInlineTest({
    "login.test.js": `
      const { attachment } = require("allure-js-commons");

      Feature("sample-feature");
      Scenario("sample-scenario", async () => {
        await attachment("data.txt", "some data", { contentType: "text/plain" });
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].steps).toHaveLength(1);
  expect(tests[0].steps[0].attachments).toHaveLength(1);

  const [attachment] = tests[0].steps[0].attachments;

  expect(attachment).toEqual({
    name: "data.txt",
    type: "text/plain",
    source: expect.any(String),
  });
  expect(attachments).toHaveProperty(attachment.source);
  expect(Buffer.from(attachments[attachment.source] as string, "base64").toString("utf8")).toEqual("some data");
});

it("handles attachments in runtime steps", async () => {
  const { tests, attachments } = await runCodeceptJsInlineTest({
    "login.test.js": `
      const { step, attachment } = require("allure-js-commons");

      Feature("sample-feature");
      Scenario("sample-scenario", async () => {
        await step("step1", async () => {
          await attachment("data.txt", "some data", { contentType: "text/plain" });
        });
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].attachments).toHaveLength(0);
  expect(tests[0].steps).toHaveLength(1);
  expect(tests[0].steps[0].steps).toHaveLength(1);
  expect(tests[0].steps[0].steps[0].attachments).toHaveLength(1);
  expect(tests[0].steps[0].steps[0].attachments).toHaveLength(1);

  const [attachment] = tests[0].steps[0].steps[0].attachments;

  expect(attachment).toEqual({
    name: "data.txt",
    type: "text/plain",
    source: expect.any(String),
  });
  expect(attachments).toHaveProperty(attachment.source);
  expect(Buffer.from(attachments[attachment.source] as string, "base64").toString("utf8")).toEqual("some data");
});
