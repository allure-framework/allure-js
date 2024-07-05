import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runCypressInlineTest } from "../utils.js";

it("reports before all hook outside suite", async () => {
  const { tests, groups } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    before(() => {});

    it("passed 1", () => {
      cy.wrap(1).should("eq", 1);
    });

    it("passed 2", () => {
      cy.wrap(1).should("eq", 1);
    });
  `,
  });

  expect(tests).toHaveLength(2);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        name: "passed 1",
      }),
      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        name: "passed 2",
      }),
    ]),
  );

  const [{ uuid: test1Uuid }, { uuid: test2Uuid }] = tests;

  expect(groups).toHaveLength(1);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: String.raw`"before all" hook`,
        children: expect.arrayContaining([test1Uuid, test2Uuid]),
        befores: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            name: String.raw`"before all" hook`,
          }),
        ]),
      }),
    ]),
  );
});

it("doesn't report after all hook outside suite", async () => {
  const { tests, groups } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    after(() => {});

    it("passed 1", () => {
      cy.wrap(1).should("eq", 1);
    });

    it("passed 2", () => {
      cy.wrap(1).should("eq", 1);
    });
  `,
  });

  expect(tests).toHaveLength(2);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        name: "passed 1",
      }),
      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        name: "passed 2",
      }),
    ]),
  );
  expect(groups).toHaveLength(0);
});

it("reports before all hook inside suite", async () => {
  const { tests, groups } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    describe("suite", () => {
      before(() => {});

      it("passed 1", () => {
        cy.wrap(1).should("eq", 1);
      });

      it("passed 2", () => {
        cy.wrap(1).should("eq", 1);
      });
    });
  `,
  });

  expect(tests).toHaveLength(2);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        name: "passed 1",
      }),
      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        name: "passed 2",
      }),
    ]),
  );

  const [{ uuid: test1Uuid }, { uuid: test2Uuid }] = tests;

  expect(groups).toHaveLength(1);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: String.raw`"before all" hook`,
        children: expect.arrayContaining([test1Uuid, test2Uuid]),
        befores: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            name: String.raw`"before all" hook`,
          }),
        ]),
      }),
    ]),
  );
});

it("reports after all hook inside suite", async () => {
  const { tests, groups } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    describe("suite", () => {
      after(() => {});

      it("passed 1", () => {
        cy.wrap(1).should("eq", 1);
      });

      it("passed 2", () => {
        cy.wrap(1).should("eq", 1);
      });
    });
  `,
  });

  expect(tests).toHaveLength(2);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        name: "passed 1",
      }),
      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        name: "passed 2",
      }),
    ]),
  );

  const [{ uuid: test1Uuid }, { uuid: test2Uuid }] = tests;

  expect(groups).toHaveLength(1);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: String.raw`"after all" hook`,
        children: expect.arrayContaining([test1Uuid, test2Uuid]),
        afters: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            name: String.raw`"after all" hook`,
          }),
        ]),
      }),
    ]),
  );
});

it("reports before each and after each hooks outside suite", async () => {
  const { tests, groups } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    beforeEach(() => {});

    afterEach(() => {});

    it("passed", () => {
      cy.wrap(1).should("eq", 1);
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.PASSED);
  expect(tests[0].stage).toBe(Stage.FINISHED);

  const [{ uuid: testUuid }] = tests;

  expect(groups).toHaveLength(2);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: String.raw`"before each" hook`,
        children: [testUuid],
        befores: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            name: String.raw`"before each" hook`,
          }),
        ]),
      }),
      expect.objectContaining({
        name: String.raw`"after each" hook`,
        children: [testUuid],
        afters: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            name: String.raw`"after each" hook`,
          }),
        ]),
      }),
    ]),
  );
});

it("reports before each and after each hooks inside suite", async () => {
  const { tests, groups } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    describe("suite", () => {
      beforeEach(() => {});

      afterEach(() => {});

      it("passed", () => {
        cy.wrap(1).should("eq", 1);
      });
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.PASSED);
  expect(tests[0].stage).toBe(Stage.FINISHED);

  const [{ uuid: testUuid }] = tests;

  expect(groups).toHaveLength(2);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: String.raw`"before each" hook`,
        children: [testUuid],
        befores: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            name: String.raw`"before each" hook`,
          }),
        ]),
      }),
      expect.objectContaining({
        name: String.raw`"after each" hook`,
        children: [testUuid],
        afters: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            name: String.raw`"after each" hook`,
          }),
        ]),
      }),
    ]),
  );
});

// see: https://github.com/allure-framework/allure-js/issues/930
it("reports manually skipped tests in hooks", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    describe("suite", () => {
      beforeEach(function () {
        this.skip();
      });

      it("skipped", () => {
        cy.wrap(1).should("eq", 1);
      });
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.SKIPPED);
  expect(tests[0].stage).toBe(Stage.FINISHED);
});
