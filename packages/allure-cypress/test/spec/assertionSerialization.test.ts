import { Stage, Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { runCypressInlineTest } from "../utils.js";

it("preserves assertion errors for DOM elements with framework properties", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
      for (const framework of [false, true]) {
        it(framework ? "framework element" : "plain element", () => {
          cy.document().then((doc) => {
            doc.body.innerHTML = '<a id="subject">text 321</a>';
            if (framework) {
              let visits = 0;
              let fiber = {
                get value() {
                  // Fail deterministically instead of allocating an exponentially large string.
                  if (++visits > 64) throw new RangeError("Invalid string length");
                  return "framework internals";
                },
              };
              for (let i = 0; i < 10; i++) fiber = { child: fiber, sibling: fiber };
              doc.querySelector("a").__reactFiber$test = fiber;
            }
          });
          cy.get("a", { timeout: 0 }).should("have.contain", "text 123");
        });
      }
      it("following test", () => { cy.wrap(1).should("eq", 1); });
    `,
  });

  expect(tests).toHaveLength(3);
  for (const name of ["plain element", "framework element"]) {
    expect(tests).toContainEqual(
      expect.objectContaining({
        name,
        status: Status.FAILED,
        stage: Stage.FINISHED,
        statusDetails: expect.objectContaining({ message: expect.stringContaining("text 123") }),
      }),
    );
    const message = tests.find((test) => test.name === name)?.statusDetails.message;
    expect(message).not.toContain("Invalid string length");
    expect(message).not.toContain("RangeError");
  }
  expect(tests).toContainEqual(expect.objectContaining({ name: "following test", status: Status.PASSED }));
});

it("uses DOM formatting and configured limits for async and sync API step errors", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress.config.js": ({ allureCypressReporterModulePath, supportFilePath, specPattern, allureDirPath }) => `
      const { allureCypress } = require("${allureCypressReporterModulePath}");
      module.exports = {
        e2e: {
          supportFile: "${supportFilePath}",
          specPattern: "${specPattern}",
          setupNodeEvents(on, config) {
            allureCypress(on, config, {
              resultsDir: "${allureDirPath}",
              stepsFromCommands: { maxArgumentDepth: 2, maxArgumentLength: 80 },
            });
            return config;
          },
        },
      };
    `,
    "cypress/e2e/sample.cy.js": ({ allureCommonsModulePath, allureCommonsSyncModulePath }) => `
      import * as asyncApi from "${allureCommonsModulePath}";
      import * as syncApi from "${allureCommonsSyncModulePath}";

      for (const [mode, api] of [["async", asyncApi], ["sync", syncApi]]) {
        for (const kind of ["logStep", "step"]) {
          it(mode + " " + kind, () => {
            cy.document().then((doc) => {
              doc.body.innerHTML = '<a id="subject">text</a>';
              const element = doc.querySelector("a");
              Object.defineProperty(element, "__reactFiber$test", {
                enumerable: true,
                get() { throw new Error("Framework internals must not be serialized"); },
              });
              const error = new chai.AssertionError("original assertion", {
                actual: { element, deep: { one: { two: "hidden" } } },
                expected: "x".repeat(100),
              });
              if (kind === "logStep") {
                const longElement = doc.createElement("a");
                longElement.setAttribute("data-value", "x".repeat(500));
                api.logStep("root DOM comparison", "failed", new chai.AssertionError("DOM assertion", {
                  actual: longElement, expected: longElement,
                }));
                api.logStep("null comparison", "failed", new chai.AssertionError("null assertion", {
                  actual: null, expected: { value: null },
                }));
                api.logStep("unserializable comparison", "failed", new chai.AssertionError("original assertion", {
                  actual: { value: 1n },
                  expected: { toJSON() { throw new Error("Cannot serialize"); } },
                }));
                return api.logStep("comparison", "failed", error);
              }
              return api.step("comparison", () => { throw error; });
            });
          });
        }
      }
    `,
  });

  const errorDetails = {
    message: "original assertion",
    trace: expect.stringContaining("sample.cy.js"),
  };
  const comparisonDetails = expect.objectContaining({
    ...errorDetails,
    actual: JSON.stringify({ element: '<a id="subject">text</a>', deep: {} }),
    expected: `${"x".repeat(80)}...`,
  });
  expect(tests).toHaveLength(4);
  for (const mode of ["async", "sync"]) {
    for (const kind of ["logStep", "step"]) {
      const test = tests.find(({ name }) => name === `${mode} ${kind}`);
      expect(test).toMatchObject({
        status: kind === "step" ? Status.FAILED : Status.PASSED,
        ...(kind === "step" ? { statusDetails: expect.objectContaining(errorDetails) } : {}),
      });
      expect(test?.steps).toContainEqual(
        expect.objectContaining({
          name: "comparison",
          status: Status.FAILED,
          statusDetails: kind === "step" ? expect.objectContaining(errorDetails) : comparisonDetails,
        }),
      );
      if (kind === "logStep") {
        const truncatedDom = `${`<a data-value="${"x".repeat(500)}"></a>`.slice(0, 80)}...`;
        expect(test?.steps).toContainEqual(
          expect.objectContaining({
            name: "root DOM comparison",
            statusDetails: expect.objectContaining({ actual: truncatedDom, expected: truncatedDom }),
          }),
        );
        expect(test?.steps).toContainEqual(
          expect.objectContaining({
            name: "null comparison",
            statusDetails: expect.objectContaining({ actual: "null", expected: '{"value":null}' }),
          }),
        );
        expect(test?.steps).toContainEqual(
          expect.objectContaining({
            name: "unserializable comparison",
            statusDetails: expect.objectContaining({
              message: "original assertion",
              actual: "[Unserializable value]",
              expected: "[Unserializable value]",
            }),
          }),
        );
      }
    }
  }
});
