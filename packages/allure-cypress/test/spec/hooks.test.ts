import { expect, it } from "vitest";
import { Stage, Status, issue } from "allure-js-commons";
import { runCypressInlineTest } from "../utils.js";

it("reports spec-level hooks", async () => {
  const { tests, groups } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    before(() => {});
    after(() => {});
    beforeEach(() => {});
    afterEach(() => {});

    it("foo", () => {});

    describe("bar", () => {
      it("bar", () => {});
    });
  `,
  });

  expect(tests).toHaveLength(2);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        name: "foo",
      }),
      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        name: "bar",
      }),
    ]),
  );

  const [{ uuid: test1Uuid }, { uuid: test2Uuid }] = tests;

  expect(groups).toHaveLength(6);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: String.raw`"before all" hook`,
        children: expect.arrayContaining([test1Uuid, test2Uuid]),
        befores: [
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            name: String.raw`"before all" hook`,
          }),
        ],
      }),
      expect.objectContaining({
        name: String.raw`"after all" hook`,
        children: expect.arrayContaining([test1Uuid, test2Uuid]),
        afters: [
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            name: String.raw`"after all" hook`,
          }),
        ],
      }),
      expect.objectContaining({
        name: String.raw`"before each" hook`,
        children: [test1Uuid],
        befores: [
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            name: String.raw`"before each" hook`,
          }),
        ],
      }),
      expect.objectContaining({
        name: String.raw`"before each" hook`,
        children: [test2Uuid],
        befores: [
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            name: String.raw`"before each" hook`,
          }),
        ],
      }),
      expect.objectContaining({
        name: String.raw`"after each" hook`,
        children: [test1Uuid],
        afters: [
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            name: String.raw`"after each" hook`,
          }),
        ],
      }),
      expect.objectContaining({
        name: String.raw`"after each" hook`,
        children: [test2Uuid],
        afters: [
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            name: String.raw`"after each" hook`,
          }),
        ],
      }),
    ]),
  );
});

it("reports suite-level hooks", async () => {
  const { tests, groups } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    describe("bar", () => {
      before(() => {});
      after(() => {});
      beforeEach(() => {});
      afterEach(() => {});

      it("foo", () => {});
    });

    it("bar", () => {});
  `,
  });

  expect(tests).toHaveLength(2);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        name: "foo",
      }),
      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        name: "bar",
      }),
    ]),
  );

  const fooUuid = tests.find(({ name }) => name === "foo")?.uuid;

  expect(groups).toHaveLength(4);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: String.raw`"before all" hook`,
        children: [fooUuid],
        befores: [
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            name: String.raw`"before all" hook`,
          }),
        ],
      }),
      expect.objectContaining({
        name: String.raw`"after all" hook`,
        children: [fooUuid],
        afters: [
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            name: String.raw`"after all" hook`,
          }),
        ],
      }),
      expect.objectContaining({
        name: String.raw`"before each" hook`,
        children: [fooUuid],
        befores: [
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            name: String.raw`"before each" hook`,
          }),
        ],
      }),
      expect.objectContaining({
        name: String.raw`"after each" hook`,
        children: [fooUuid],
        afters: [
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            name: String.raw`"after each" hook`,
          }),
        ],
      }),
    ]),
  );
});

it("should keep hooks from different specs separated", async () => {
  const { tests, groups } = await runCypressInlineTest({
    "cypress/e2e/sample1.cy.js": () => `
      before("sample 1", () => {});
      after("sample 1", () => {});
      beforeEach("sample 1", () => {});
      afterEach("sample 1", () => {});

      it("foo", () => {});
    `,
    "cypress/e2e/sample2.cy.js": () => `
      before("sample 2", () => {});
      after("sample 2", () => {});
      beforeEach("sample 2", () => {});
      afterEach("sample 2", () => {});

      it("bar", () => {});
    `,
  });

  expect(tests).toHaveLength(2);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        name: "foo",
      }),
      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        name: "bar",
      }),
    ]),
  );

  const fooUuid = tests.find(({ name }) => name === "foo")?.uuid;
  const barUuid = tests.find(({ name }) => name === "bar")?.uuid;

  expect(groups).toHaveLength(8);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: String.raw`"before all" hook: sample 1`,
        children: [fooUuid],
        befores: [
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            name: String.raw`"before all" hook: sample 1`,
          }),
        ],
      }),
      expect.objectContaining({
        name: String.raw`"before all" hook: sample 2`,
        children: [barUuid],
        befores: [
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            name: String.raw`"before all" hook: sample 2`,
          }),
        ],
      }),
      expect.objectContaining({
        name: String.raw`"after all" hook: sample 1`,
        children: [fooUuid],
        afters: [
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            name: String.raw`"after all" hook: sample 1`,
          }),
        ],
      }),
      expect.objectContaining({
        name: String.raw`"after all" hook: sample 2`,
        children: [barUuid],
        afters: [
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            name: String.raw`"after all" hook: sample 2`,
          }),
        ],
      }),
      expect.objectContaining({
        name: String.raw`"before each" hook: sample 1`,
        children: [fooUuid],
        befores: [
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            name: String.raw`"before each" hook: sample 1`,
          }),
        ],
      }),
      expect.objectContaining({
        name: String.raw`"before each" hook: sample 2`,
        children: [barUuid],
        befores: [
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            name: String.raw`"before each" hook: sample 2`,
          }),
        ],
      }),
      expect.objectContaining({
        name: String.raw`"after each" hook: sample 1`,
        children: [fooUuid],
        afters: [
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            name: String.raw`"after each" hook: sample 1`,
          }),
        ],
      }),
      expect.objectContaining({
        name: String.raw`"before each" hook: sample 2`,
        children: [barUuid],
        befores: [
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
            name: String.raw`"before each" hook: sample 2`,
          }),
        ],
      }),
    ]),
  );
});

// see: https://github.com/allure-framework/allure-js/issues/930
it("reports manually skipped tests in hooks", async () => {
  await issue("930");
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


it("should report an error in a beforeEach hook", async () => {
  await issue("1072");
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
      beforeEach(function () {
        if (this.currentTest.title === "bar") {
          throw new Error("Lorem Ipsum");
        }
      });

      it("foo", () => {});
      it("bar", () => {});
      it("baz", () => {});
      describe("suite", () => {
        it("qux", () => {});
      });
    `,
  });

  expect(tests).toHaveLength(3);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "foo",
        status: Status.PASSED,
        stage: Stage.FINISHED,
        statusDetails: expect.objectContaining({
          message: ""
        }),
      }),
      expect.objectContaining({
        name: "bar",
        status: Status.BROKEN,
        stage: Stage.FINISHED,
        statusDetails: expect.objectContaining({
          message: expect.stringContaining("Lorem Ipsum"),
        }),
      }),
      expect.objectContaining({
        name: "baz",
        status: Status.SKIPPED,
        stage: Stage.FINISHED,
        statusDetails: expect.objectContaining({
          message: expect.stringContaining("Lorem Ipsum"),
        }),
      }),
      expect.objectContaining({
        name: "qux",
        status: Status.SKIPPED,
        stage: Stage.FINISHED,
        statusDetails: expect.objectContaining({
          message: expect.stringContaining("Lorem Ipsum"),
        }),
      }),
    ]),
  );
});
