import { expect, it } from "vitest";
import { Status } from "allure-js-commons";
import { runCodeceptJsInlineTest } from "../utils.js";

it("should add bdd steps", async () => {
  const { tests } = await runCodeceptJsInlineTest({
    "features/basic.feature": `Feature: simple
  Scenario: passed
    Given a passed step`,
    "step_definitions/steps.js": ` Given("a passed step", () => { });`,
    "codecept.conf.js": `
        const path = require("node:path");
        const { setCommonPlugins } = require("@codeceptjs/configure");

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
        const { setCommonPlugins } = require("@codeceptjs/configure");

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
            ExpectHelper: {},
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

it("should support failed bdd steps", async () => {
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
        const { setCommonPlugins } = require("@codeceptjs/configure");

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
            ExpectHelper: {},
          },
        };
      `,
  });

  expect(tests).toHaveLength(1);
  const [tr] = tests;
  expect(tr.steps).toMatchObject([
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
  ]);
});
