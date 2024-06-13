import { expect, it } from "vitest";
import { LinkType } from "allure-js-commons";
import { runCodeceptJsInlineTest } from "../../../utils.js";

it("sets runtime links", async () => {
  const results = await runCodeceptJsInlineTest({
    "sample.test.js": `
      Feature("login-feature");
      Scenario("login-scenario1", async () => {
        const allure = codeceptjs.container.plugins("allure");

        await allure.link("custom", "https://playwright.dev/docs/api/class-page#page-workers");
        await allure.issue("issue 1", "1");
        await allure.issue("issue 2", "https://example.org/issues/2");
        await allure.tms("task 1", "1");
        await allure.tms("task 2", "https://example.org/tasks/2");
      });
    `,
    "codecept.conf.js": `
      const path = require("node:path");
      const { setCommonPlugins } = require("@codeceptjs/configure");

      setCommonPlugins();

      module.exports.config = {
        tests: "./**/*.test.js",
        output: path.resolve(__dirname, "./output"),
        plugins: {
          allure: {
            require: require.resolve("allure-codeceptjs"),
            testMode: true,
            enabled: true,
            links: {
              ${LinkType.ISSUE}: {
                urlTemplate: "https://example.org/issues/%s",
              },
              ${LinkType.TMS}: {
                urlTemplate: "https://example.org/tasks/%s",
              }
            }
          },
        },
        helpers: {
          CustomHelper: {
            require: "./helper.js",
          },
        },
      };
    `,
  });

  expect(results.tests).toEqual([
    expect.objectContaining({
      links: [
        {
          url: "https://playwright.dev/docs/api/class-page#page-workers",
          type: "custom",
        },
        {
          url: "https://example.org/issues/1",
          type: LinkType.ISSUE,
          name: "issue 1",
        },
        {
          url: "https://example.org/issues/2",
          type: LinkType.ISSUE,
          name: "issue 2",
        },
        {
          url: "https://example.org/tasks/1",
          type: LinkType.TMS,
          name: "task 1",
        },
        {
          url: "https://example.org/tasks/2",
          type: LinkType.TMS,
          name: "task 2",
        },
      ],
    }),
  ]);
});
