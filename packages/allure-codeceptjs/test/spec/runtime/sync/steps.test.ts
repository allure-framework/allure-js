import { Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { runCodeceptJsInlineTest } from "../../../utils.js";

it("handles sync runtime api", async () => {
  const { tests, attachments } = await runCodeceptJsInlineTest({
    "sample.test.js": `
      const { attachment, label, step } = require("allure-js-commons/sync");

      Feature("sync-feature");
      Scenario("sync-scenario", () => {
        label("mode", "sync");

        step("outer", (ctx) => {
          ctx.displayName("renamed outer");
          ctx.parameter("browser", "chromium");

          step("inner", () => {
            attachment("foo.txt", "bar", { contentType: "text/plain" });
          });
        });
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: "mode", value: "sync" }));
  expect(tests[0].steps).toHaveLength(1);
  expect(tests[0].steps[0]).toMatchObject({
    name: "renamed outer",
    status: Status.PASSED,
    parameters: [{ name: "browser", value: "chromium" }],
  });

  const [attachmentStep] = tests[0].steps[0].steps[0].steps;
  const [attachment] = attachmentStep.attachments;
  expect(attachmentStep.name).toBe("foo.txt");
  expect(attachment.type).toBe("text/plain");
  expect(Buffer.from(attachments[attachment.source] as string, "base64").toString("utf8")).toBe("bar");
});
