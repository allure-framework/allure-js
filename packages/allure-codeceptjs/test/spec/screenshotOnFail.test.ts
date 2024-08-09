import { expect, it } from "vitest";
import { Status } from "allure-js-commons";
import { runCodeceptJsInlineTest } from "../utils.js";

it("should support screenshotOnFail plugin", async () => {
  const { tests, attachments } = await runCodeceptJsInlineTest({
    "nested/login.test.js": `
        const { container } = require('codeceptjs')

        Feature("login-feature");
        Scenario("login-scenario1", async ({ I }) => {
          await I.pass();
        });
        Scenario("login-scenario2", async ({ I }) => {
          await I.pass();
          await I.fail();
        });
      `,
    "codecept.conf.js": `
        const path = require("node:path");
        const { setCommonPlugins } = require("@codeceptjs/configure");

        setCommonPlugins();

        exports.config = {
          tests: "./**/*.test.js",
          output: path.resolve(__dirname, "./output"),
          plugins: {
            allure: {
              require: require.resolve("allure-codeceptjs"),
              enabled: true,
            },
            screenshotOnFail: {
              enabled: true
            }
          },
          helpers: {
            Playwright: {
              require: "./helper.js",
            },
            Expect: {},
          },
        };
      `,
    "helper.js": `
        const Helper = require("@codeceptjs/helper");
        const { writeFile } = require("fs/promises");
        const path = require("path");

        class MyHooksHelper extends Helper {

          async pass() {
            await Promise.resolve();
          }

          async fail() {
            await Promise.reject(new Error("should have failed"));
          }

          async saveScreenshot(fileName) {
             const outputPath = path.join(global.output_dir, fileName);
             await writeFile(outputPath, Buffer.from(JSON.stringify(fileName)), "utf-8");
          }
        }

        module.exports = MyHooksHelper;
      `,
  });

  const attachmentSources = Object.keys(attachments);
  expect(attachmentSources).toHaveLength(1);

  expect(tests).toHaveLength(2);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: Status.PASSED,
        name: "login-scenario1",
        steps: [
          expect.objectContaining({
            name: "I pass",
          }),
        ],
      }),
      expect.objectContaining({
        status: Status.BROKEN,
        name: "login-scenario2",
        steps: [
          expect.objectContaining({
            name: "I pass",
          }),
          expect.objectContaining({
            name: "I fail",
          }),
          expect.objectContaining({
            name: "Main session - Last Seen Screenshot",
            attachments: [
              expect.objectContaining({
                name: "Main session - Last Seen Screenshot",
                type: "image/png",
                source: attachmentSources[0],
              }),
            ],
          }),
        ],
      }),
    ]),
  );
});
