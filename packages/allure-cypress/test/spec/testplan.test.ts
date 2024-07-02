import { join } from "node:path";
import { expect, it } from "vitest";
import type { TestPlanV1 } from "allure-js-commons/sdk";
import { runCypressInlineTest } from "../utils.js";

it("respects testplan", async () => {
  const exampleTestPlan: TestPlanV1 = {
    version: "1.0",
    tests: [
      {
        id: 1,
        selector: "cypress/e2e/nested/super strange nested/super strange name.cy.js#also nested should execute",
      },
      {
        id: 2,
        selector: "cypress/e2e/b.cy.js#should execute",
      },
      {
        id: 3,
        selector: "cypress/e2e/.+.cy.js#+.",
      },
      {
        id: 4,
        selector: "cypress/e2e/notaga.cy.js#a",
      },
    ],
  };
  const testPlanFilename = "example-testplan.json";
  const { tests } = await runCypressInlineTest(
    {
      [testPlanFilename]: () => JSON.stringify(exampleTestPlan),
      "cypress/e2e/a.test.js": () => `
        it('should not execute', () => {
          cy.wrap(1).should("eq", 1);
        });
        `,
      "cypress/e2e/b.cy.js": () => `
        it('should execute', () => {
          cy.wrap(1).should("eq", 1);
        });
        `,
      "cypress/e2e/nested/super strange nested/super strange name.cy.js": () => `
        describe('also nested', () => {
          it('should execute', () => {
            cy.wrap(1).should("eq", 1);
          });
        });
        `,
      "cypress/e2e/.+.cy.js": () => `
         it('+.', () => {
           cy.wrap(1).should("eq", 1);
         });
       `,
      "cypress/e2e/aga.cy.js": () => `
         it('a', () => {
           cy.wrap(1).should("eq", 1);
         });
         it('aa', () => {
           cy.wrap(1).should("eq", 1);
         });
         it('selected name @allure.id=5', () => {
           cy.wrap(1).should("eq", 1);
         });
       `,
      "cypress/e2e/notaga.cy.js": () => `
         it('a', () => {
           cy.wrap(1).should("eq", 1);
         });
       `,
    },
    (testDir) => ({
      ALLURE_TESTPLAN_PATH: join(testDir, testPlanFilename),
    }),
  );

  expect(tests.map(({ fullName }) => fullName)).toEqual(
    expect.arrayContaining([
      "cypress/e2e/b.cy.js#should execute",
      "cypress/e2e/notaga.cy.js#a",
      "cypress/e2e/nested/super strange nested/super strange name.cy.js#also nested should execute",
    ]),
  );
});
