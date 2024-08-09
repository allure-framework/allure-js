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

  expect(tests).toHaveLength(3);
  expect(tests.map(({ fullName }) => fullName)).toEqual(
    expect.arrayContaining([
      "cypress/e2e/b.cy.js#should execute",
      "cypress/e2e/notaga.cy.js#a",
      "cypress/e2e/nested/super strange nested/super strange name.cy.js#also nested should execute",
    ]),
  );
});

it("should deselect all tests not in test plan", async () => {
  const exampleTestPlan: TestPlanV1 = {
    version: "1.0",
    tests: [{ id: "1" }],
  };
  const testPlanFilename = "testplan.json";
  const { tests } = await runCypressInlineTest(
    {
      [testPlanFilename]: () => JSON.stringify(exampleTestPlan),
      "cypress/e2e/sample.cy.js": () => `
        describe("suite 1", () => {
          it('test 1.1', () => {});
          it('test 1.2', () => {});
          describe("suite 1.1", () => {
            it('test 1.1.1', () => {});
            it('test 1.1.2', () => {});
          });
          describe("suite 1.2", () => {
            it('test 1.2.1', () => {});
            it('test 1.2.2', () => {});
          });
        });
        describe("suite 2", () => {
          it('test 1.1', () => {});
          it('test 1.2', () => {});
          describe("suite 2.1", () => {
            it('test 2.1.1', () => {});
            it('test 2.1.2', () => {});
          });
          describe("suite 2.2", () => {
            it('test 2.2.1', () => {});
            it('test 2.2.2', () => {});
          });
        });
        it('test 1', () => {});
        it('test 2', () => {});
      `,
    },
    (testDir) => ({
      ALLURE_TESTPLAN_PATH: join(testDir, testPlanFilename),
    }),
  );

  expect(tests).toEqual([]);
});

it("should not trigger hooks", async () => {
  const exampleTestPlan: TestPlanV1 = {
    version: "1.0",
    tests: [{ selector: "cypress/e2e/sample.cy.js#bar" }],
  };
  const testPlanFilename = "testplan.json";
  const { tests, groups } = await runCypressInlineTest(
    {
      [testPlanFilename]: () => JSON.stringify(exampleTestPlan),
      "cypress/e2e/sample.cy.js": ({ allureCommonsModulePath }) => `
        import { attachment } from "${allureCommonsModulePath}";
        let hooks = 0;
        after(() => {
          if (hooks > 0) {
            throw new Error();
          }
        });
        describe("suite", () => {
          before(() => { hooks++; });
          beforeEach(() => { hooks++; });
          it('foo', () => {
            attachment("testplan", JSON.stringify(Cypress.env("allure")), "application/json");
          });
        });
        it("bar", () => {});
      `,
    },
    (testDir) => ({
      ALLURE_TESTPLAN_PATH: join(testDir, testPlanFilename),
    }),
  );

  expect(tests).toEqual([
    expect.objectContaining({
      name: "bar",
      status: "passed",
    }),
  ]);
  expect(groups).toEqual([
    expect.objectContaining({
      afters: [expect.objectContaining({ status: "passed" })],
    }),
  ]);
});
