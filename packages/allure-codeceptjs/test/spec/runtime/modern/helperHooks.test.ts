import { expect, it } from "vitest";
import { Status } from "allure-js-commons";
import { runCodeceptJsInlineTest } from "../../../utils.js";

it("should support runtime API in helper _beforeStep & _afterStep hooks", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "nested/login.test.js": `
        Feature("login-feature");
        Scenario("login-scenario1", async ({ I }) => {
          await I.pass();
        });
        Scenario("login-scenario2", async () => {});
      `,
    "helper.js": `
        const Helper = require("@codeceptjs/helper");
        const allure = require("allure-js-commons");

        class MyHooksHelper extends Helper {
          async _beforeStep() {
            await allure.logStep("_beforeStep");
          }

          async _afterStep() {
            await allure.logStep("_afterStep");
          }

          async pass() {
            await Promise.resolve();
          }
        }
        module.exports = MyHooksHelper;
    `,
  });

  expect(tests).toHaveLength(2);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: Status.PASSED,
        name: "login-scenario1",
        steps: [
          expect.objectContaining({
            name: "_beforeStep",
          }),
          expect.objectContaining({
            name: "I pass",
            steps: [
              expect.objectContaining({
                name: "_afterStep",
              }),
            ],
          }),
        ],
      }),
      expect.objectContaining({
        status: Status.PASSED,
        name: "login-scenario2",
      }),
    ]),
  );
});

// it's doesn't reported in time, don't know why
it.skip("should support runtime API in helper _passed", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "nested/login.test.js": `
        Feature("login-feature");
        Scenario("login-scenario1", async ({ I }) => {
          await I.pass();
        });
        Scenario("login-scenario2", async ({ I }) => {
          await I.fail();
        });
      `,
    "helper.js": `
        const Helper = require("@codeceptjs/helper");
        const allure = require("allure-js-commons");

        class MyHooksHelper extends Helper {
          async _passed() {
            await allure.logStep("_passed");
          }

          async pass() {
            await Promise.resolve();
          }

          async fail() {
            await Promise.reject(new Error("should have failed"));
          }
        }

        module.exports = MyHooksHelper;
    `,
  });

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
          expect.objectContaining({
            name: "_passed",
          }),
        ],
      }),
      expect.objectContaining({
        status: Status.BROKEN,
        name: "login-scenario2",
        steps: [
          expect.objectContaining({
            name: "I fail",
          }),
        ],
      }),
    ]),
  );
});

it("should support runtime API in helper _failed hook", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "nested/login.test.js": `
        Feature("login-feature");
        Scenario("login-scenario1", async ({ I }) => {
          await I.pass();
        });
        Scenario("login-scenario2", async ({ I }) => {
          await I.fail();
        });
      `,
    "helper.js": `
        const Helper = require("@codeceptjs/helper");
        const allure = require("allure-js-commons");

        class MyHooksHelper extends Helper {
          async _passed() {
            await allure.logStep("_passed");
          }

          async _failed() {
            await allure.logStep("_failed");
          }

          async pass() {
            await Promise.resolve();
          }

          async fail() {
            await Promise.reject(new Error("should have failed"));
          }
        }

        module.exports = MyHooksHelper;
    `,
  });

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
            name: "I fail",
          }),
          expect.objectContaining({
            name: "_failed",
          }),
        ],
      }),
    ]),
  );
});

it("should support runtime API in helper _after hook", async () => {
  const { tests, groups } = await runCodeceptJsInlineTest({
    "nested/login.test.js": `
        Feature("login-feature");
        Scenario("login-scenario1", async ({ I }) => {
          await I.pass();
        });
        Scenario("login-scenario2", async ({ I }) => {
          await I.fail();
        });
      `,
    "helper.js": `
        const Helper = require("@codeceptjs/helper");
        const allure = require("allure-js-commons");

        class MyHooksHelper extends Helper {
          async _after() {
            await allure.logStep("_after");
          }

          async pass() {
            await Promise.resolve();
          }

          async fail() {
            await Promise.reject(new Error("should have failed"));
          }
        }

        module.exports = MyHooksHelper;
    `,
  });

  expect(tests).toHaveLength(2);
  const tr1 = tests.find((t) => t.name === "login-scenario1")!;
  const tr2 = tests.find((t) => t.name === "login-scenario2")!;

  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: String.raw`"after each" hook: finalize codeceptjs`,
        children: [tr1.uuid],
        afters: [
          expect.objectContaining({
            name: String.raw`"after each" hook: finalize codeceptjs`,
            steps: [
              expect.objectContaining({
                name: "_after",
                status: Status.PASSED,
              }),
            ],
          }),
        ],
      }),
      expect.objectContaining({
        name: String.raw`"after each" hook: finalize codeceptjs`,
        children: [tr2.uuid],
        afters: [
          expect.objectContaining({
            name: String.raw`"after each" hook: finalize codeceptjs`,
            steps: [
              expect.objectContaining({
                name: "_after",
                status: Status.PASSED,
              }),
            ],
          }),
        ],
      }),
    ]),
  );
});
