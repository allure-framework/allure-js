import { expect, it } from "vitest";
import { type Attachment, ContentType } from "allure-js-commons";
import { runCypressInlineTest } from "../utils.js";

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

  const [attachment1]: Attachment[] = tests[0].attachments;
  expect(attachment1.name).toBe("Video");
  expect(attachment1.type).toBe(ContentType.MP4);
  expect(attachments).to.contain.keys(attachment1.source);

  const [attachment2]: Attachment[] = tests[1].attachments;
  expect(attachment2.name).toBe("Video");
  expect(attachment2.type).toBe(ContentType.MP4);
  expect(attachments).to.contain.keys(attachment2.source);
});
