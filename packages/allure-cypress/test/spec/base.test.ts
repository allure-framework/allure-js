import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runCypressInlineTest } from "../utils.js";

it("passed test", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    it("passed", () => {
      cy.wrap(1).should("eq", 1);
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.PASSED);
  expect(tests[0].stage).toBe(Stage.FINISHED);
});

it("failed test", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    it("failed", () => {
      cy.wrap(1).should("eq", 2);
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.FAILED);
  expect(tests[0].stage).toBe(Stage.FINISHED);
});

it("broken test", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    it("broken", () => {
      throw new Error("broken");
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.BROKEN);
  expect(tests[0].stage).toBe(Stage.FINISHED);
  expect(tests[0].statusDetails).toHaveProperty("message", "broken");
});

it("skipped tests", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    it.skip("skipped-1", () => {
      cy.wrap(1).should("eq", 1);
    });
    it("passing", () => {
      cy.wrap(1).should("eq", 1);
    });
    it.skip("skipped-2", () => {
      cy.wrap(2).should("eq", 2);
    });
  `,
  });

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "passing",
        status: Status.PASSED,
        stage: Stage.FINISHED,
      }),
      expect.objectContaining({
        name: "skipped-1",
        status: Status.SKIPPED,
        stage: Stage.FINISHED,
      }),
      expect.objectContaining({
        name: "skipped-2",
        status: Status.SKIPPED,
        stage: Stage.FINISHED,
      }),
    ]),
  );
});

it("reports tests in real time", async () => {
  const { tests, timestamps } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
      it("foo", () => {});

      it("bar", () => {});
    `,
  });

  const [{ uuid: fooUuid }] = tests.filter((t) => t.name === "foo");
  const [{ start: barStart }] = tests.filter((t) => t.name === "bar");
  const fooWriteTime = timestamps.get(fooUuid)?.getTime();

  expect(fooWriteTime).toBeLessThanOrEqual(barStart!);
});

it("can be used with custom Node events", async () => {
  const { tests, groups, envInfo } = await runCypressInlineTest({
    "cypress.config.js": () => `
      const { defineConfig } = require("cypress");
      const { allureCypress } = require("allure-cypress/reporter");

      module.exports = defineConfig({
        e2e: {
          baseUrl: "https://allurereport.org",
          viewportWidth: 1240,
          setupNodeEvents: (on, config) => {
            const reporter = allureCypress(on, config, {
              environmentInfo: { foo: "bar" },
            });
            on("after:spec", (spec, results) => {
              reporter.onAfterSpec(spec, results);
            });
            on("after:run", (results) => {
              reporter.onAfterRun(results);
            });
            return config;
          },
        },
      });
    `,
    "cypress/e2e/sample.cy.js": () => `
      before(() => {});
      it("foo", () => {});
    `,
  });

  expect(tests).toEqual([
    expect.objectContaining({
      name: "foo",
      status: Status.PASSED,
    }),
  ]);

  // Spec-level hooks can't be reported without after:spec forwarding
  expect(groups).toEqual([
    expect.objectContaining({
      children: [tests[0].uuid],
      befores: [
        expect.objectContaining({
          name: String.raw`"before all" hook`,
          status: Status.PASSED,
        }),
      ],
    }),
  ]);

  // Environment info can't be reported without after:run forwarding
  expect(envInfo).toEqual({ foo: "bar" });
});
