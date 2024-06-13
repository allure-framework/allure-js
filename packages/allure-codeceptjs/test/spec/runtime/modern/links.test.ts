import { expect, it } from "vitest";
import { LinkType } from "allure-js-commons";
import { runCodeceptJsInlineTest } from "../../../utils.js";

it("sets runtime links", async () => {
  const results = await runCodeceptJsInlineTest({
    "sample.test.js": `
      const { link, links, issue, tms } = require('allure-js-commons');

      Feature("login-feature");
      Scenario("login-scenario1", async () => {
        await link("https://playwright.dev/docs/api/class-page#page-workers");
        await issue("1");
        await issue("https://example.org/issues/2");
        await tms("1");
        await tms("https://example.org/tasks/2");
        await links(...[{ url:"https://www.google.com/1" }, { url:"https://www.google.com/2" }]);
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
        },
        {
          url: "https://example.org/issues/1",
          type: LinkType.ISSUE,
        },
        {
          url: "https://example.org/issues/2",
          type: LinkType.ISSUE,
        },
        {
          url: "https://example.org/tasks/1",
          type: LinkType.TMS,
        },
        {
          url: "https://example.org/tasks/2",
          type: LinkType.TMS,
        },
        {
          url: "https://www.google.com/1",
        },
        {
          url: "https://www.google.com/2",
        },
      ],
    }),
  ]);
});
