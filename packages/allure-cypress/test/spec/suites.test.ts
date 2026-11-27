import { Status, type TestResult } from "allure-js-commons";
import { expect, it } from "vitest";

import { runCypressInlineTest } from "../utils.js";

const suiteLabelsByTest = (tests: TestResult[]) =>
  Object.fromEntries(
    tests.map(({ name, labels }) => [
      name,
      labels
        .filter((label) => ["parentSuite", "suite", "subSuite"].includes(label.name))
        .map(({ name: labelName, value }) => `${labelName}: ${value}`)
        .sort(),
    ]),
  );

it("should replace only explicitly supplied suite levels and preserve explicit duplicates", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": ({ allureCommonsModulePath }) => `
      const { parentSuite, suite, subSuite } = require("${allureCommonsModulePath}");
      describe("default parent", () => {
        describe("default suite", () => {
          describe("default sub", () => {
            describe("leaf", () => {
              it("defaults", () => {});
              it("runtime", () => {
                parentSuite("Web interface");
                suite("Ajax");
                subSuite("Requests");
              });
              it("partial", () => { suite("custom suite"); });
              it("title @allure.label.parentSuite:title-parent @allure.label.suite:title-suite", () => {});
              it("duplicates", () => {
                parentSuite("first");
                parentSuite("second");
              });
            });
          });
        });
      });
    `,
  });

  expect(tests).toHaveLength(5);
  expect(suiteLabelsByTest(tests)).toEqual({
    defaults: ["parentSuite: default parent", "subSuite: default sub > leaf", "suite: default suite"],
    runtime: ["parentSuite: Web interface", "subSuite: Requests", "suite: Ajax"],
    partial: ["parentSuite: default parent", "subSuite: default sub > leaf", "suite: custom suite"],
    title: ["parentSuite: title-parent", "subSuite: default sub > leaf", "suite: title-suite"],
    duplicates: ["parentSuite: first", "parentSuite: second", "subSuite: default sub > leaf", "suite: default suite"],
  });
});

it("should respect suite levels supplied through environment variables", async () => {
  const { tests } = await runCypressInlineTest(
    {
      "cypress/e2e/sample.cy.js": () => `
        describe("default parent", () => {
          describe("default suite", () => {
            it("environment", () => {});
          });
        });
      `,
    },
    { env: () => ({ ALLURE_LABEL_parentSuite: "env-parent" }) },
  );

  expect(tests).toHaveLength(1);
  expect(suiteLabelsByTest(tests)).toEqual({
    environment: ["parentSuite: env-parent", "suite: default suite"],
  });
});

it("should apply defaults after hook metadata, including tests skipped by a failed hook", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": ({ allureCommonsModulePath }) => `
      const { parentSuite, suite } = require("${allureCommonsModulePath}");
      describe("default parent", () => {
        before(() => { parentSuite("hook-parent"); });
        describe("default suite", () => {
          beforeEach(() => { suite("hook-suite"); });
          it("hooks", () => {});
          it.skip("pending @allure.label.suite:pending-suite", () => {});
        });
      });
      describe("failed parent", () => {
        describe("failed suite", () => {
          before(() => {
            parentSuite("failed-hook-parent");
            throw new Error("setup failed");
          });
          it("first skipped", () => {});
          it("next skipped @allure.label.suite:explicit-suite", () => {});
        });
      });
    `,
  });

  expect(tests).toHaveLength(4);
  expect(Object.fromEntries(tests.map(({ name, status }) => [name, status]))).toEqual({
    "hooks": Status.PASSED,
    "pending": Status.SKIPPED,
    "first skipped": Status.BROKEN,
    "next skipped": Status.BROKEN,
  });
  expect(suiteLabelsByTest(tests)).toEqual({
    "hooks": ["parentSuite: hook-parent", "suite: hook-suite"],
    "pending": ["parentSuite: hook-parent", "suite: pending-suite"],
    "first skipped": ["parentSuite: failed-hook-parent", "suite: failed suite"],
    "next skipped": ["parentSuite: failed-hook-parent", "suite: explicit-suite"],
  });
});

it("can replace both hierarchies from the browser runtime", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": ({ allureCommonsModulePath, allureCommonsSyncModulePath }) => `
      const { suites } = require("${allureCommonsModulePath}");
      const { bdd } = require("${allureCommonsSyncModulePath}");

      describe("Default parent", () => {
        describe("Default suite", () => {
          it("custom hierarchy @allure.label.story:Old-story", () => {
            suites("Custom suite");
            bdd("Custom epic", "Custom feature");
          });
        });
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(suiteLabelsByTest(tests)).toEqual({ "custom hierarchy": ["suite: Custom suite"] });
  expect(
    tests[0].labels
      .filter(({ name }) => ["epic", "feature", "story"].includes(name))
      .map(({ name, value }) => `${name}: ${value}`)
      .sort(),
  ).toEqual(["epic: Custom epic", "feature: Custom feature"]);
});
