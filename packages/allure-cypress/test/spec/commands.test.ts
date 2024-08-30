import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { issue } from "allure-js-commons";
import { runCypressInlineTest } from "../utils.js";

it("reports test with cypress command", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    it("with commands", () => {
      cy.log(1);
      cy.log("2");
      cy.log([1, 2, 3]);
      cy.log({ foo: 1, bar: 2, baz: 3 });
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.PASSED);
  expect(tests[0].stage).toBe(Stage.FINISHED);
  expect(tests[0].steps).toHaveLength(4);
  expect(tests[0].steps).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: String.raw`Command "log"`,
        parameters: expect.arrayContaining([
          expect.objectContaining({
            name: String.raw`Argument [0]`,
            value: JSON.stringify(1),
          }),
        ]),
      }),
      expect.objectContaining({
        name: String.raw`Command "log"`,
        parameters: expect.arrayContaining([
          expect.objectContaining({
            name: String.raw`Argument [0]`,
            value: "2",
          }),
        ]),
      }),
      expect.objectContaining({
        name: String.raw`Command "log"`,
        parameters: expect.arrayContaining([
          expect.objectContaining({
            name: String.raw`Argument [0]`,
            value: JSON.stringify([1, 2, 3]),
          }),
        ]),
      }),
      expect.objectContaining({
        name: String.raw`Command "log"`,
        parameters: expect.arrayContaining([
          expect.objectContaining({
            name: String.raw`Argument [0]`,
            value: JSON.stringify({ foo: 1, bar: 2, baz: 3 }),
          }),
        ]),
      }),
    ]),
  );
});

it("doesn't report cypress command when they shouldn't be reported", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    it("with commands", () => {
      cy.log(1, { log: false });
      cy.log("2", { log: false });
      cy.log([1, 2, 3], { log: false });
      cy.log({ foo: 1, bar: 2, baz: 3 }, { log: false });
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.PASSED);
  expect(tests[0].stage).toBe(Stage.FINISHED);
  expect(tests[0].steps).toHaveLength(0);
});

it("should impose limits on command arguments", async () => {
  issue("1070");
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
      it("foo", () => {
        const obj1 = {};
        obj1.ref = obj1; // should remove a direct circular reference 'ref'
        cy.wrap(obj1);

        const sibling = {};
        cy.wrap({ ref: { foo: sibling, bar: sibling } }); // it's okay to have the same object on different paths

        const obj2 = { ref: {} };
        obj2.ref.ref = obj2;
        cy.wrap(obj2); // should remove an indirect circular reference 'ref.ref'

        cy.wrap("A".repeat(1000)); // should truncate string values
        cy.wrap(Array(1000).fill("A")); // should truncate objects
        cy.wrap({ foo: { bar: { baz: { qux: {}, qut: 10 } } } }) // should remove 'qux' at nesting level 4 but keep 'qut'
      });
    `,
  });

  expect(tests).toEqual([
    expect.objectContaining({
      steps: [
        expect.objectContaining({
          parameters: [
            {
              name: "Argument [0]",
              value: JSON.stringify({}),
            },
          ],
        }),
        expect.objectContaining({
          parameters: [
            {
              name: "Argument [0]",
              value: JSON.stringify({ ref: { foo: {}, bar: {} } }),
            },
          ],
        }),
        expect.objectContaining({
          parameters: [
            {
              name: "Argument [0]",
              value: JSON.stringify({ ref: {} }),
            },
          ],
        }),
        expect.objectContaining({
          parameters: [
            {
              name: "Argument [0]",
              value: `${"A".repeat(128)}...`,
            },
          ],
        }),
        expect.objectContaining({
          parameters: [
            {
              name: "Argument [0]",
              value: `[${String.raw`"A",`.repeat(31)}"A"...`,
            },
          ],
        }),
        expect.objectContaining({
          parameters: [
            {
              name: "Argument [0]",
              value: JSON.stringify({ foo: { bar: { baz: { qut: 10 } } } }),
            },
          ],
        }),
      ],
    }),
  ]);
});

it("should take the limits from the config", async () => {
  issue("1070");
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
      it("foo", () => {
        cy.wrap("A".repeat(100)); // should truncate string values
        cy.wrap(Array(100).fill("A")); // should truncate objects
        cy.wrap({ foo: { bar: { }, baz: "qux" } }) // should remove 'bar' at nesting level 2 but keep 'baz'
      });
    `,
    "cypress.config.js": ({ allureCypressModuleBasePath }) => `
      const { allureCypress } = require("${allureCypressModuleBasePath}/reporter.js");

      module.exports = {
        e2e: {
          baseUrl: "https://allurereport.org",
          viewportWidth: 1240,
          setupNodeEvents: (on, config) => {
            allureCypress(on, config, {
              stepsFromCommands: {
                maxArgumentLength: 25,
                maxArgumentDepth: 1,
              }
            });

            return config;
          },
        },
      };
    `,
  });

  expect(tests).toEqual([
    expect.objectContaining({
      steps: [
        expect.objectContaining({
          parameters: [
            {
              name: "Argument [0]",
              value: `${"A".repeat(25)}...`,
            },
          ],
        }),
        expect.objectContaining({
          parameters: [
            {
              name: "Argument [0]",
              value: `[${String.raw`"A",`.repeat(6)}...`,
            },
          ],
        }),
        expect.objectContaining({
          parameters: [
            {
              name: "Argument [0]",
              value: JSON.stringify({ foo: { baz: "qux" } }),
            },
          ],
        }),
      ],
    }),
  ]);
});
