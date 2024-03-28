import { expect, it } from "vitest";
import { ContentType } from "allure-js-commons";
import { runCypressInlineTest } from "../utils";

it("attaches same video to each spec in a test", async () => {
  const { tests, attachments } = await runCypressInlineTest(
    `
      import { historyId } from "allure-cypress";

      it("foo", () => {});

      it("bar", () => {});
    `,
    () =>
      `
      const { allureCypress } = require("allure-cypress/reporter");

      module.exports = {
        experimentalInteractiveRunEvents: true,
        e2e: {
          baseUrl: "https://allurereport.org",
          viewportWidth: 1240,
          video: true,
          setupNodeEvents: (on, config) => {
            allureCypress(on, {
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
  expect(attachments).toHaveProperty(attachment.source);
});
