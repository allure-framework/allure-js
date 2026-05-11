import { Status } from "allure-js-commons";
import { describe, expect, it } from "vitest";

import { createVitestConfig, runVitestInlineTest } from "../../../utils.js";

describe("sync steps", () => {
  describe('for "node"', () => {
    it("handles sync runtime api", async () => {
      const { tests, attachments } = await runVitestInlineTest({
        "vitest.config.ts": ({ allureResultsPath }) => createVitestConfig(allureResultsPath),
        "sample.test.ts": `
          import { test } from "vitest";
          import { attachment, label, step } from "allure-js-commons/sync";

          test("sync step", () => {
            label("mode", "sync");

            step("outer", (ctx) => {
              ctx.displayName("renamed outer");
              ctx.parameter("browser", "chromium");

              step("inner", () => {
                attachment("foo.txt", Buffer.from("bar"), { contentType: "text/plain" });
              });
            });
          });
        `,
      });
      expect(tests).toHaveLength(1);
      expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: "mode", value: "sync" }));
      expect(tests[0].steps[0]).toMatchObject({
        name: "renamed outer",
        status: Status.PASSED,
        parameters: [{ name: "browser", value: "chromium" }],
      });

      const [attachmentStep] = tests[0].steps[0].steps[0].steps;
      const [attachment] = attachmentStep.attachments;
      expect(attachmentStep.name).toBe("foo.txt");
      expect(Buffer.from(attachments[attachment.source] as string, "base64").toString("utf8")).toBe("bar");
    });
  });
});
