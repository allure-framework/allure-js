import { Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { runCodeceptJsInlineTest } from "../utils.js";

it("should support screenshot plugin", async () => {
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
        const { setCommonPlugins } = require("./codeceptjs-configure.js");

        setCommonPlugins();

        exports.config = {
          tests: "./**/*.test.js",
          output: path.resolve(__dirname, "./output"),
          plugins: {
            allure: {
              require: require.resolve("allure-codeceptjs"),
              enabled: true,
            },
            screenshot: {
              enabled: true,
              on: "fail",
            }
          },
          helpers: {
            Playwright: {
              require: "./helper.js",
            },
            ExpectHelper: {
              require: require.resolve("codeceptjs-expect"),
            },
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
            status: Status.BROKEN,
          }),
          expect.objectContaining({
            name: "login-scenario2.failed.png",
            attachments: [
              expect.objectContaining({
                name: "login-scenario2.failed.png",
                type: "image/png",
                source: attachmentSources[0],
              }),
            ],
          }),
        ],
      }),
    ]),
  );
}, 10_000);

it("attaches failure-time artifacts when scenario fails in before hook", async () => {
  const { tests, attachments } = await runCodeceptJsInlineTest({
    "before-hook-failure.test.js": `
        Feature("before-hook-failure-feature");

        Before(async ({ I }) => {
          await I.fail();
        });

        Scenario("before-hook-failure-scenario-a", async ({ I }) => {
          await I.pass();
        });

        Scenario("before-hook-failure-scenario-b", async ({ I }) => {
          await I.pass();
        });
      `,
    "failedAttachmentPlugin.js": `
        const { attachment } = require("allure-js-commons");
        const { event } = require("codeceptjs");

        module.exports = () => {
          event.dispatcher.on(event.test.failed, (test) => {
            attachment(test.title + ".txt", "artifact from " + test.title, { contentType: "text/plain" });
          });
        };
      `,
    "codecept.conf.js": `
        const path = require("node:path");
        const { setCommonPlugins } = require("./codeceptjs-configure.js");

        setCommonPlugins();

        exports.config = {
          tests: "./**/*.test.js",
          output: path.resolve(__dirname, "./output"),
          plugins: {
            allure: {
              require: require.resolve("allure-codeceptjs"),
              enabled: true,
            },
            screenshot: {
              enabled: true,
              on: "fail",
            },
            failedAttachmentPlugin: {
              require: "./failedAttachmentPlugin.js",
              enabled: true,
            }
          },
          helpers: {
            Playwright: {
              require: "./helper.js",
            },
            ExpectHelper: {
              require: require.resolve("codeceptjs-expect"),
            },
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
            await Promise.reject(new Error("before hook failed"));
          }

          async saveScreenshot(fileName) {
             const outputPath = path.join(global.output_dir, fileName);
             await writeFile(outputPath, Buffer.from(JSON.stringify(fileName)), "utf-8");
          }
        }

        module.exports = MyHooksHelper;
      `,
  });

  expect(tests).toHaveLength(2);
  for (const test of tests) {
    const attachmentName = `${test.name}.txt`;
    const screenshotNamePattern = new RegExp(`^${test.name}.*\\.failed\\.png$`);

    expect(test).toMatchObject({
      status: Status.BROKEN,
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: attachmentName,
          attachments: [
            expect.objectContaining({
              name: attachmentName,
              type: "text/plain",
              source: expect.any(String),
            }),
          ],
        }),
        expect.objectContaining({
          name: expect.stringMatching(screenshotNamePattern),
          attachments: [
            expect.objectContaining({
              name: expect.stringMatching(screenshotNamePattern),
              type: "image/png",
              source: expect.any(String),
            }),
          ],
        }),
      ]),
    });

    const attachmentStep = test.steps.find((step) => step.name === attachmentName);
    const attachmentSource = attachmentStep?.attachments[0]?.source;

    expect(attachmentSource).toEqual(expect.any(String));
    if (!attachmentSource) {
      throw new Error(`${attachmentName} source is missing`);
    }
    expect(Buffer.from(attachments[attachmentSource] as string, "base64").toString("utf8")).toBe(
      `artifact from ${test.name}`,
    );
  }
}, 10_000);
