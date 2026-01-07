import { expect, it } from "vitest";
import { Status } from "allure-js-commons";
import { runCodeceptJsInlineTest } from "../utils.js";

it("should support steps in page objects", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "nested/login.test.js": `
        const { container } = require('codeceptjs')

        Feature("login-feature");
        Scenario("login-scenario1", async ({ I, login }) => {
          await I.pass();
          await login.onMainPage();
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
            }
          },
          helpers: {
            CustomHelper: {
              require: "./helper.js",
            }
          },
          include: {
            login: './pages/login.js',
          }
        };
      `,
    "helper.js": `
        const Helper = require("@codeceptjs/helper");

        class CustomHelper extends Helper {

          async pass() {
            await Promise.resolve();
          }

          async next() {
            await Promise.resolve();
          }

        }

        module.exports = CustomHelper;
      `,
    "pages/login.js": `
        const { I } = inject();

        module.exports = {
            async onMainPage() {
                await I.next();
            }
        }
        `,
  });

  expect(tests).toHaveLength(1);
  const [tr] = tests;
  expect(tr).toMatchObject({
    status: Status.PASSED,
    name: "login-scenario1",
    steps: [
      {
        name: "I pass",
        status: Status.PASSED,
      },
      {
        name: "On login: on main page",
        status: Status.PASSED,
        steps: [
          {
            name: "I next",
            status: Status.PASSED,
          },
        ],
      },
    ],
  });
});

it("should support failed steps in page objects", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "nested/login.test.js": `
        const { container } = require('codeceptjs')

        Feature("login-feature");
        Scenario("login-scenario1", async ({ I, login }) => {
          I.pass();
          login.onMainPage();
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
            }
          },
          helpers: {
            CustomHelper: {
              require: "./helper.js",
            }
          },
          include: {
            login: './pages/login.js',
          }
        };
      `,
    "helper.js": `
        const Helper = require("@codeceptjs/helper");

        class CustomHelper extends Helper {

          async pass() {
            await Promise.resolve();
          }

          async fail() {
            await Promise.reject(new Error("an error"));
          }

        }

        module.exports = CustomHelper;
      `,
    "pages/login.js": `
        const { I } = inject();

        module.exports = {
            async onMainPage() {
                I.pass();
                I.fail();
                I.pass();
            }
        }
        `,
  });

  expect(tests).toHaveLength(1);

  const [tr] = tests;

  expect(tr).toMatchObject({
    status: Status.BROKEN,
    name: "login-scenario1",
    statusDetails: {
      message: expect.stringContaining("an error"),
      trace: expect.stringContaining("CustomHelper.fail"),
    },
    steps: [
      {
        name: "I pass",
        status: Status.PASSED,
      },
      {
        name: "On login: on main page",
        status: Status.BROKEN,
        statusDetails: {
          message: expect.stringContaining("an error"),
          trace: expect.stringContaining("CustomHelper.fail"),
        },
        steps: [
          {
            name: "I pass",
            status: Status.PASSED,
          },
          {
            name: "I fail",
            status: Status.BROKEN,
            statusDetails: {
              message: expect.stringContaining("an error"),
              trace: expect.stringContaining("CustomHelper.fail"),
            },
          },
        ],
      },
    ],
  });
});

it("should support actor steps", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "nested/login.test.js": `
        const { container } = require('codeceptjs')

        Feature("login-feature");
        Scenario("login-scenario1", async ({ I }) => {
          await I.pass();
          await I.onMainPage();
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
            }
          },
          helpers: {
            CustomHelper: {
              require: "./helper.js",
            }
          },
          include: {
            I: './pages/custom_steps.js',
          }
        };
      `,
    "helper.js": `
        const Helper = require("@codeceptjs/helper");

        class CustomHelper extends Helper {

          async pass() {
            await Promise.resolve();
          }

          async next() {
            await Promise.resolve();
          }

        }

        module.exports = CustomHelper;
      `,
    "pages/custom_steps.js": `
        module.exports = function() {
          return actor({

            onMainPage: async function(email, password) {
              await this.next();
            }
          });
        }
        `,
  });

  expect(tests).toHaveLength(1);
  const [tr] = tests;
  expect(tr).toMatchObject({
    status: Status.PASSED,
    name: "login-scenario1",
    steps: [
      {
        name: "I pass",
        status: Status.PASSED,
      },
      {
        name: "I on main page",
        status: Status.PASSED,
        steps: [
          {
            name: "I next",
            status: Status.PASSED,
          },
        ],
      },
    ],
  });
});

it("should support failed actor steps", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "nested/login.test.js": `
        const { container } = require('codeceptjs')

        Feature("login-feature");
        Scenario("login-scenario1", async ({ I }) => {
          await I.pass();
          await I.onMainPage();
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
            }
          },
          helpers: {
            CustomHelper: {
              require: "./helper.js",
            }
          },
          include: {
            I: './pages/custom_steps.js',
          }
        };
      `,
    "helper.js": `
        const Helper = require("@codeceptjs/helper");

        class CustomHelper extends Helper {

          async pass() {
            await Promise.resolve();
          }

          async fail() {
            await Promise.reject(new Error("an error"));
          }

        }

        module.exports = CustomHelper;
      `,
    "pages/custom_steps.js": `
        module.exports = function() {
          return actor({

            onMainPage: async function(email, password) {
              await this.pass();
              await this.fail();
              await this.pass();
            }
          });
        }
        `,
  });

  expect(tests).toHaveLength(1);
  const [tr] = tests;
  expect(tr).toMatchObject({
    status: Status.BROKEN,
    statusDetails: {
      message: expect.stringContaining("an error"),
      trace: expect.stringContaining("CustomHelper.fail"),
    },
    name: "login-scenario1",
    steps: [
      {
        name: "I pass",
        status: Status.PASSED,
      },
      {
        name: "I on main page",
        status: Status.BROKEN,
        statusDetails: {
          message: expect.stringContaining("an error"),
          trace: expect.stringContaining("CustomHelper.fail"),
        },
        steps: [
          {
            name: "I pass",
            status: Status.PASSED,
          },
          {
            name: "I fail",
            status: Status.BROKEN,
            statusDetails: {
              message: expect.stringContaining("an error"),
              trace: expect.stringContaining("CustomHelper.fail"),
            },
          },
        ],
      },
    ],
  });
});

it("should support nested page object steps", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "nested/login.test.js": `
        const { container } = require('codeceptjs')

        Feature("login-feature");
        Scenario("login-scenario1", async ({ I, page1, page2 }) => {
          I.pass();
          page1.fewNestedSteps();
          page2.onNextPage();
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
            }
          },
          helpers: {
            CustomHelper: {
              require: "./helper.js",
            }
          },
          include: {
            page1: './pages/page1.js',
            page2: './pages/page2.js',
          }
        };
      `,
    "helper.js": `
        const Helper = require("@codeceptjs/helper");

        class CustomHelper extends Helper {

          async pass() {
            await Promise.resolve();
          }

          async next() {
            await Promise.resolve();
          }

        }

        module.exports = CustomHelper;
      `,
    "pages/page1.js": `
        const { I, page2 } = inject();

        module.exports = {
            async fewNestedSteps() {
                I.pass();
                I.next();
                await page2.onNextPage();
            }
        }
        `,
    "pages/page2.js": `
        const { I } = inject();

        module.exports = {
            async onNextPage() {
                I.pass();
                I.next();
            }
        }
        `,
  });

  expect(tests).toHaveLength(1);

  const [tr] = tests;

  expect(tr).toMatchObject({
    name: "login-scenario1",
    steps: [
      {
        name: "I pass",
        status: Status.PASSED,
      },
      {
        name: "On page1: few nested steps",
        status: Status.PASSED,
        steps: [
          {
            name: "I pass",
            status: Status.PASSED,
          },
          {
            name: "I next",
            status: Status.PASSED,
          },
          {
            name: "I pass",
            status: Status.PASSED,
          },
          {
            name: "I next",
            status: Status.PASSED,
          },
        ],
      },
      {
        name: "On page2: on next page",
        status: Status.PASSED,
        steps: [
          {
            name: "I pass",
            status: Status.PASSED,
          },
          {
            name: "I next",
            status: Status.PASSED,
          },
        ],
      },
    ],
  });
});
