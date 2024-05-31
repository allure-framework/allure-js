import { expect, it } from "vitest";
import { type Attachment, ContentType } from "allure-js-commons";
import { runCypressInlineTest } from "../utils";

it("attaches same video to each spec in a test", async () => {
  const { tests, attachments } = await runCypressInlineTest(
    () => `
      it("foo", () => {});

      it("bar", () => {});
    `,
    () =>
      `
      const { allureCypress } = require("allure-cypress/reporter");

      module.exports = {
        e2e: {
          baseUrl: "https://allurereport.org",
          viewportWidth: 1240,
          video: true,
          setupNodeEvents: (on, config) => {
            const reporter = allureCypress(on, {
              links: [
                {
                  type: "issue",
                  urlTemplate: "https://allurereport.org/issues/%s"
                },
                {
                  type: "tms",
                  urlTemplate: "https://allurereport.org/tasks/%s"
                },
              ]
            });

            on("after:spec", (spec, result) => {
              reporter.endSpec(spec, result);
            });

            return config;
          },
        },
      };
    `,
  );

  expect(tests).toHaveLength(2);

  const [attachment] = tests[0].attachments;

  expect(attachment.name).toBe("Video");
  expect(attachment.type).toBe(ContentType.MP4);
  expect(tests[1].attachments).toContainEqual(attachment);
  expect(attachments).toHaveProperty((attachment as Attachment).source);
});
