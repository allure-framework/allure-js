import { expect, it } from "vitest";
import { Status } from "allure-js-commons";
import { runCodeceptJsInlineTest } from "../utils.js";

it("should support codeceptjs assertions", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "nested/login.test.js": `
        const { container } = require('codeceptjs')

        Feature("login-feature");
        Scenario("assert scenario", async ({ I }) => {
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
          },
          helpers: {
            Playwright: {
              require: "./helper.js",
            },
          },
        };
      `,
    "helper.js": `
        const Helper = require("@codeceptjs/helper");
        const { writeFile } = require("fs/promises");
        const path = require("path");
        const AssertionFailedError = require("./assert.js");

        class MyHooksHelper extends Helper {

          async pass() {
            await Promise.resolve();
          }

          async fail() {
            await Promise.reject(new AssertionFailedError({ actual: "1", expected: "2"}));
          }

        }

        module.exports = MyHooksHelper;
      `,
    "assert.js": `
        function AssertionFailedError(params) {
          this.params = params;
          this.actual = this.params.actual;
          this.expected = this.params.expected;

          this.inspect = () => {
            return "expect " + this.expected + " but " + this.actual;
          }
        }

        AssertionFailedError.prototype = Object.create(Error.prototype);
        AssertionFailedError.constructor = AssertionFailedError;
        module.exports = AssertionFailedError;
      `,
  });

  expect(tests).toHaveLength(1);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "assert scenario",
        status: Status.FAILED,
        statusDetails: expect.objectContaining({
          message: "expect 2 but 1",
        }),
        steps: [
          expect.objectContaining({
            name: "I pass",
          }),
          expect.objectContaining({
            name: "I fail",
            status: Status.FAILED,
            statusDetails: expect.objectContaining({
              message: "expect 2 but 1",
            }),
          }),
        ],
      }),
    ]),
  );
});
