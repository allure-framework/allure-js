import { ContentType, Stage, Status } from "allure-js-commons";
import type { TestResult } from "allure-js-commons";
import { expect, it } from "vitest";

import { runCypressInlineTest } from "../utils.js";

type CypressConfigPaths = {
  allureCypressReporterModulePath: string;
  supportFilePath: string;
  specPattern: string;
  allureDirPath: string;
};

const cypressConfigWithRetries =
  (retries: string) =>
  ({ allureCypressReporterModulePath, supportFilePath, specPattern, allureDirPath }: CypressConfigPaths) =>
    `
    const { allureCypress } = require("${allureCypressReporterModulePath}");

    module.exports = {
      e2e: {
        retries: ${retries},
        defaultCommandTimeout: 500,
        supportFile: "${supportFilePath}",
        specPattern: "${specPattern}",
        setupNodeEvents: (on, config) => {
          allureCypress(on, config, { resultsDir: "${allureDirPath}" });
          return config;
        },
      },
    };
  `;

const inStartOrder = (tests: TestResult[]) => [...tests].sort((a, b) => a.start! - b.start!);

const retryParameter = (value: string) => ({ name: "Retry", value, excluded: true });

const getGroupsOfTest = <T extends { children: string[] }>(groups: T[], { uuid }: TestResult) =>
  groups.filter(({ children }) => children.includes(uuid));

it("reports every attempt of a test that keeps failing", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
      it("failed", () => {
        cy.wrap(Cypress.currentRetry).should("eq", -1);
      });
    `,
    "cypress.config.js": cypressConfigWithRetries("2"),
  });

  expect(tests).toHaveLength(3);

  // Allure groups results with the same history id and shows the earlier ones as retries of the latest one.
  expect(new Set(tests.map(({ historyId }) => historyId)).size).toBe(1);

  const [firstAttempt, secondAttempt, lastAttempt] = inStartOrder(tests);
  expect(firstAttempt).toMatchObject({
    name: "failed",
    status: Status.FAILED,
    stage: Stage.FINISHED,
    statusDetails: { message: expect.stringContaining("expected 0 to equal -1") },
    attachments: [{ name: "failed (failed).png", type: ContentType.PNG }],
  });
  expect(firstAttempt.parameters).not.toContainEqual(expect.objectContaining({ name: "Retry" }));
  expect(secondAttempt).toMatchObject({
    name: "failed",
    status: Status.FAILED,
    stage: Stage.FINISHED,
    statusDetails: { message: expect.stringContaining("expected 1 to equal -1") },
    attachments: [{ name: "failed (failed) (attempt 2).png", type: ContentType.PNG }],
    parameters: [retryParameter("1")],
  });
  expect(lastAttempt).toMatchObject({
    name: "failed",
    status: Status.FAILED,
    stage: Stage.FINISHED,
    statusDetails: { message: expect.stringContaining("expected 2 to equal -1") },
    attachments: [{ name: "failed (failed) (attempt 3).png", type: ContentType.PNG }],
    parameters: [retryParameter("2")],
  });

  // Each attempt keeps the steps of its own run.
  for (const attempt of tests) {
    expect(attempt.steps).toEqual([
      expect.objectContaining({ name: expect.stringMatching(/^wrap /), status: Status.FAILED }),
    ]);
  }
});

it("keeps the failed attempts of a test that passes after a retry", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
      it("passes after retry", () => {
        cy.wrap(Cypress.currentRetry).should("eq", 1);
      });
    `,
    "cypress.config.js": cypressConfigWithRetries("1"),
  });

  expect(tests).toHaveLength(2);
  expect(new Set(tests.map(({ historyId }) => historyId)).size).toBe(1);

  // No extra (e.g., skipped) results are reported for the retried attempt.
  const [failedAttempt, passedAttempt] = inStartOrder(tests);
  expect(failedAttempt).toMatchObject({
    name: "passes after retry",
    status: Status.FAILED,
    stage: Stage.FINISHED,
    statusDetails: { message: expect.stringContaining("expected 0 to equal 1") },
  });
  expect(failedAttempt.parameters).not.toContainEqual(expect.objectContaining({ name: "Retry" }));
  expect(passedAttempt).toMatchObject({
    name: "passes after retry",
    status: Status.PASSED,
    stage: Stage.FINISHED,
    parameters: [retryParameter("1")],
  });
});

it("doesn't mark a test that passes on the first attempt as retried", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
      it("passed", () => {});
    `,
    "cypress.config.js": cypressConfigWithRetries("2"),
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.PASSED);
  expect(tests[0].parameters).not.toContainEqual(expect.objectContaining({ name: "Retry" }));
});

it("reports a failed 'before each' hook of an attempt that is retried", async () => {
  const { tests, groups } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
      beforeEach(() => {
        cy.wrap(Cypress.currentRetry).should("eq", 1);
      });

      it("foo", () => {});
    `,
    "cypress.config.js": cypressConfigWithRetries("1"),
  });

  expect(tests).toHaveLength(2);

  const [failedAttempt, passedAttempt] = inStartOrder(tests);
  expect(failedAttempt).toMatchObject({
    name: "foo",
    status: Status.FAILED,
    statusDetails: { message: expect.stringContaining("expected 0 to equal 1") },
  });
  expect(passedAttempt).toMatchObject({
    name: "foo",
    status: Status.PASSED,
    parameters: [retryParameter("1")],
  });

  expect(getGroupsOfTest(groups, failedAttempt).flatMap(({ befores }) => befores)).toEqual([
    expect.objectContaining({
      name: String.raw`"before each" hook`,
      status: Status.FAILED,
      statusDetails: expect.objectContaining({ message: expect.stringContaining("expected 0 to equal 1") }),
      steps: [expect.objectContaining({ status: Status.FAILED })],
    }),
  ]);
  expect(getGroupsOfTest(groups, passedAttempt).flatMap(({ befores }) => befores)).toEqual([
    expect.objectContaining({
      name: String.raw`"before each" hook`,
      status: Status.PASSED,
    }),
  ]);
});

it("reports a failed 'after each' hook of an attempt that is retried", async () => {
  const { tests, groups } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
      afterEach(() => {
        cy.wrap(Cypress.currentRetry).should("eq", 1);
      });

      it("foo", () => {});
    `,
    "cypress.config.js": cypressConfigWithRetries("1"),
  });

  expect(tests).toHaveLength(2);

  const [firstAttempt, secondAttempt] = inStartOrder(tests);
  expect(firstAttempt.parameters).not.toContainEqual(expect.objectContaining({ name: "Retry" }));
  expect(secondAttempt.parameters).toEqual([retryParameter("1")]);

  expect(getGroupsOfTest(groups, firstAttempt).flatMap(({ afters }) => afters)).toEqual([
    expect.objectContaining({
      name: String.raw`"after each" hook`,
      status: Status.FAILED,
      statusDetails: expect.objectContaining({ message: expect.stringContaining("expected 0 to equal 1") }),
    }),
  ]);
  expect(getGroupsOfTest(groups, secondAttempt).flatMap(({ afters }) => afters)).toEqual([
    expect.objectContaining({
      name: String.raw`"after each" hook`,
      status: Status.PASSED,
    }),
  ]);
});

it("reports passed attempts that Cypress retries to detect flakiness", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
      it("flaky", () => {
        cy.wrap(Cypress.currentRetry).should("be.gt", 0);
      });
    `,
    "cypress.config.js": cypressConfigWithRetries(`{
      runMode: true,
      openMode: true,
      experimentalStrategy: "detect-flake-and-pass-on-threshold",
      experimentalOptions: { maxRetries: 3, passesRequired: 2 },
    }`),
  });

  expect(inStartOrder(tests)).toEqual([
    expect.objectContaining({ status: Status.FAILED, parameters: [] }),
    expect.objectContaining({ status: Status.PASSED, parameters: [retryParameter("1")] }),
    expect.objectContaining({ status: Status.PASSED, parameters: [retryParameter("2")] }),
  ]);
});
