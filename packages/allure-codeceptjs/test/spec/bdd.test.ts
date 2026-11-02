import { Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { runCodeceptJsInlineTest } from "../utils.js";

it("should add bdd steps", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "features/basic.feature": `Feature: simple
  Scenario: passed
    Given a passed step`,
    "step_definitions/steps.js": ` Given("a passed step", () => { });`,
    "codecept.conf.js": `
        const path = require("node:path");
        const { setCommonPlugins } = require("./codeceptjs-configure.js");

        setCommonPlugins();

        exports.config = {
          output: path.resolve(__dirname, "./output"),
          plugins: {
            allure: {
              require: require.resolve("allure-codeceptjs"),
              enabled: true,
            },
          },
          gherkin: {
            features: "./features/*.feature",
            steps: ["./step_definitions/steps.js"],
          },
        };
      `,
  });

  expect(tests).toHaveLength(1);
  const [tr] = tests;
  expect(tr.steps).toMatchObject([
    {
      name: "Given a passed step",
      status: Status.PASSED,
    },
  ]);
});

it("should support helper steps in bdd steps", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "features/basic.feature": `Feature: simple
  Scenario: passed
    Given a world
    When we smile
    Then all good`,
    "step_definitions/steps.js": `const I = actor();
    Given("a world", async () => { await I.pass(); });
    When("we smile", async () => { await I.pass(); await I.next(); });
    Then("all good", async () => { await I.next(); await I.pass(); await I.next(); await I.pass(); });`,
    "codecept.conf.js": `
        const path = require("node:path");
        const { setCommonPlugins } = require("./codeceptjs-configure.js");

        setCommonPlugins();

        exports.config = {
          output: path.resolve(__dirname, "./output"),
          plugins: {
            allure: {
              require: require.resolve("allure-codeceptjs"),
              enabled: true,
            },
          },
          gherkin: {
            features: "./features/*.feature",
            steps: ["./step_definitions/steps.js"],
          },
          helpers: {
            CustomHelper: {
              require: "./helper.js",
            },
            ExpectHelper: {
              require: require.resolve("codeceptjs-expect"),
            },
          },
        };
      `,
  });

  expect(tests).toHaveLength(1);
  const [tr] = tests;
  expect(tr.steps).toMatchObject([
    {
      name: "Given a world",
      steps: [
        {
          name: "I pass",
          status: Status.PASSED,
        },
      ],
    },
    {
      name: "When we smile",
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
    {
      name: "Then all good",
      steps: [
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
        {
          name: "I pass",
          status: Status.PASSED,
        },
      ],
    },
  ]);
});

it("should support broken bdd steps for raw errors", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "features/basic.feature": `Feature: simple
  Scenario: passed
    Given a world
    When we smile
    Then all good
    Then this one is ignored`,
    "step_definitions/steps.js": `const I = actor();
    Given("a world", async () => { await I.pass(); });
    When("we smile", async () => { await I.pass(); await I.next(); });
    Then("all good", async () => { await I.next(); await I.fail(); });
    Then(" this one is ignored", async () => { });`,
    "codecept.conf.js": `
        const path = require("node:path");
        const { setCommonPlugins } = require("./codeceptjs-configure.js");

        setCommonPlugins();

        exports.config = {
          output: path.resolve(__dirname, "./output"),
          plugins: {
            allure: {
              require: require.resolve("allure-codeceptjs"),
              enabled: true,
            },
          },
          gherkin: {
            features: "./features/*.feature",
            steps: ["./step_definitions/steps.js"],
          },
          helpers: {
            CustomHelper: {
              require: "./helper.js",
            },
            ExpectHelper: {
              require: require.resolve("codeceptjs-expect"),
            },
          },
        };
      `,
  });

  expect(tests).toHaveLength(1);
  const [tr] = tests;
  expect(tr).toMatchObject({
    status: Status.BROKEN,
    steps: [
      {
        name: "Given a world",
        status: Status.PASSED,
        steps: [
          {
            name: "I pass",
            status: Status.PASSED,
          },
        ],
      },
      {
        name: "When we smile",
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
      {
        name: "Then all good",
        status: Status.BROKEN,
        statusDetails: {
          message: expect.stringContaining("an error"),
        },
        steps: [
          {
            name: "I next",
            status: Status.PASSED,
          },
          {
            name: "I fail",
            status: Status.BROKEN,
            statusDetails: {
              message: expect.stringContaining("an error"),
            },
          },
        ],
      },
    ],
  });
});

it("keeps consecutive Gherkin steps as siblings when they call page-object methods", async () => {
  const { tests, attachments } = await runCodeceptJsInlineTest({
    "features/basic.feature": `Feature: nesting
  Scenario: page-object steps
    Given action 1
    When action 2
    Then action 3
    And action 4
  Scenario: failed page-object step
    Given action 1
    When action 2
    Then failing action
    And ignored action
  Scenario: following scenario
    Given action 1`,
    "step_definitions/steps.js": `
      const { actions } = inject();
      Given("action 1", async () => { await actions.perform(); });
      When("action 2", async () => { await actions.perform(); });
      Then("action 3", async () => { await actions.perform(); });
      Then("action 4", async () => { await actions.perform(); });
      Then("failing action", async () => { await actions.fail(); });
      Then("ignored action", () => { throw new Error("must not execute"); });
    `,
    "pages/actions.js": `
      const { I } = inject();
      module.exports = {
        async perform() {
          await I.pass();
        },
        async fail() {
          await I.fail();
        },
      };
    `,
    "helper.js": `
      const Helper = require("@codeceptjs/helper");
      const { attachment } = require("allure-js-commons");
      module.exports = class extends Helper {
        async pass() { await attachment("passed artifact", "passed", "text/plain"); }
        async fail() {
          await attachment("failed artifact", "failed", "text/plain");
          throw new Error("original failure");
        }
      };
    `,
    "codecept.conf.js": `
      const { setCommonPlugins } = require("./codeceptjs-configure.js");
      setCommonPlugins();
      let stopOrder = 0;
      exports.config = {
        output: "./output",
        plugins: {
          allure: {
            require: require.resolve("allure-codeceptjs"), enabled: true,
            listeners: [{ afterStepStop(step) {
              step.parameters.push({ name: "stop order", value: String(++stopOrder) });
            } }],
          },
          retryFailedStep: { enabled: false },
        },
        gherkin: { features: "./features/*.feature", steps: ["./step_definitions/steps.js"] },
        helpers: { CustomHelper: { require: "./helper.js" } },
        include: { actions: "./pages/actions.js" },
      };
    `,
  });

  expect(tests).toHaveLength(3);
  const passed = tests.find(({ name }) => name === "page-object steps")!;
  expect(passed.status).toBe(Status.PASSED);
  expect(passed.steps).toMatchObject(
    ["Given action 1", "When action 2", "Then action 3", "And action 4"].map((name) => ({
      name,
      status: Status.PASSED,
      steps: [
        {
          name: "On actions: perform",
          status: Status.PASSED,
          steps: [{ name: "I pass" }, { name: "passed artifact" }],
        },
      ],
    })),
  );
  const failed = tests.find(({ name }) => name === "failed page-object step")!;
  expect(failed).toMatchObject({ status: Status.BROKEN, statusDetails: { message: "original failure" } });
  expect(failed.steps.map(({ name, status }) => ({ name, status }))).toEqual([
    { name: "Given action 1", status: Status.PASSED },
    { name: "When action 2", status: Status.PASSED },
    { name: "Then failing action", status: Status.BROKEN },
  ]);
  const failingStep = failed.steps[2];
  expect(failingStep.statusDetails.message).toBe("original failure");
  expect(failingStep.steps[0]).toMatchObject({
    name: "On actions: fail",
    status: Status.BROKEN,
    steps: [{ name: "I fail", status: Status.BROKEN }, { name: "failed artifact" }],
  });
  const stopOrder = (step: { parameters: { name: string; value: string }[] }) =>
    Number(step.parameters.find(({ name }) => name === "stop order")!.value);
  const failedPage = failingStep.steps[0];
  expect(stopOrder(failedPage.steps[0])).toBeLessThan(stopOrder(failedPage));
  expect(stopOrder(failedPage)).toBeLessThan(stopOrder(failingStep));
  const artifact = failingStep.steps[0].steps.find(({ name }) => name === "failed artifact")!.attachments[0];
  expect(Buffer.from(attachments[artifact.source] as string, "base64").toString()).toBe("failed");
  const following = tests.find(({ name }) => name === "following scenario")!;
  expect(following).toMatchObject({
    status: Status.PASSED,
    steps: [{ name: "Given action 1", status: Status.PASSED }],
  });
});
