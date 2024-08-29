/* eslint max-lines: off */
import { describe } from "node:test";
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

describe("hook errors", () => {
  it("should report a failed spec-level beforeEach", async () => {
    await issue("1072");
    const { tests, groups } = await runCypressInlineTest({
      "cypress/e2e/sample.cy.js": () => `
        beforeEach(function () {
          if (this.currentTest.title === "baz") {
            throw new Error("Lorem Ipsum");
          }
        });
        after("spec-level", () => {});

        it("foo", () => {}); // should pass and get beforeEach and after("spec-level")
        describe("suite 1", () => {
          after("suite 1", () => {});
          it("bar", () => {}); // should pass and get beforeEach, after("suite 1"), and after("spec-level")
          it("baz", () => {}); // should break and get beforeEach, after("suite 1"), and after("spec-level")
          it("qux", () => {}); // should skip and get after("suite 1") and after("spec-level")
        });
        describe("suite 2", () => {
          after("suite 2", () => {}); // shouldn't be executed at all
          it("quux", () => {}); // should skip and get after("spec-level")
        });
      `,
    });

    expect(tests).toHaveLength(5);
    expect(tests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "foo",
          status: Status.PASSED,
          stage: Stage.FINISHED,
        }),
        expect.objectContaining({
          name: "bar",
          status: Status.PASSED,
          stage: Stage.FINISHED,
        }),
        expect.objectContaining({
          name: "baz",
          status: Status.BROKEN,
          stage: Stage.FINISHED,
          statusDetails: expect.objectContaining({
            message: "Lorem Ipsum",
          }),
        }),
        expect.objectContaining({
          name: "qux",
          status: Status.SKIPPED,
          stage: Stage.FINISHED,
          statusDetails: expect.objectContaining({
            message: String.raw`'"before each" hook for "baz"' defined in the root suite has failed`,
          }),
        }),
        expect.objectContaining({
          name: "quux",
          status: Status.SKIPPED,
          stage: Stage.FINISHED,
          statusDetails: expect.objectContaining({
            message: String.raw`'"before each" hook for "baz"' defined in the root suite has failed`,
          }),
        }),
      ]),
    );
    const fooUuid = tests.find((t) => t.name === "foo")!.uuid;
    const barUuid = tests.find((t) => t.name === "bar")!.uuid;
    const bazUuid = tests.find((t) => t.name === "baz")!.uuid;
    const quxUuid = tests.find((t) => t.name === "qux")!.uuid;
    const quuxUuid = tests.find((t) => t.name === "quux")!.uuid;
    expect(groups).toHaveLength(5);
    expect(groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          children: [fooUuid],
          befores: [
            expect.objectContaining({
              name: String.raw`"before each" hook`,
              status: Status.PASSED,
            }),
          ],
        }),
        expect.objectContaining({
          children: [barUuid],
          befores: [
            expect.objectContaining({
              name: String.raw`"before each" hook`,
              status: Status.PASSED,
            }),
          ],
        }),
        expect.objectContaining({
          children: [bazUuid],
          befores: [
            expect.objectContaining({
              name: String.raw`"before each" hook`,
              status: Status.BROKEN,
              statusDetails: expect.objectContaining({
                message: "Lorem Ipsum",
              }),
            }),
          ],
        }),
        expect.objectContaining({
          children: [barUuid, bazUuid, quxUuid],
          afters: [
            expect.objectContaining({
              name: String.raw`"after all" hook: suite 1`,
              status: Status.PASSED,
            }),
          ],
        }),
        expect.objectContaining({
          children: [fooUuid, barUuid, bazUuid, quxUuid, quuxUuid],
          afters: [
            expect.objectContaining({
              name: String.raw`"after all" hook: spec-level`,
              status: Status.PASSED,
            }),
          ],
        }),
      ]),
    );
  });

  it("should report a failed spec-level afterEach", async () => {
    await issue("1072");
    const { tests, groups } = await runCypressInlineTest({
      "cypress/e2e/sample.cy.js": () => `
        afterEach(function () {
          if (this.currentTest.title === "baz") {
            throw new Error("Lorem Ipsum");
          }
        });
        after("spec-level", () => {});

        it("foo", () => {}); // should pass and get afterEach and after("spec-level")
        describe("suite 1", () => {
          after("suite 1", () => {});
          it("bar", () => {}); // should pass and get afterEach, after("suite 1"), and after("spec-level")
          it("baz", () => {}); // should pass and get afterEach, after("suite 1"), and after("spec-level")
          it("qux", () => {}); // should skip and get after("suite 1") and after("spec-level")
        });
        describe("suite 2", () => {
          after("suite 2", () => {}); // shouldn't be executed at all
          it("quux", () => {}); // should skip and get after("spec-level")
        });
      `,
    });

    expect(tests).toHaveLength(5);
    expect(tests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "foo",
          status: Status.PASSED,
          stage: Stage.FINISHED,
        }),
        expect.objectContaining({
          name: "bar",
          status: Status.PASSED,
          stage: Stage.FINISHED,
        }),
        expect.objectContaining({
          name: "baz",
          status: Status.PASSED, // after/afterEach don't affect the test's status
          stage: Stage.FINISHED,
        }),
        expect.objectContaining({
          name: "qux",
          status: Status.SKIPPED,
          stage: Stage.FINISHED,
          statusDetails: expect.objectContaining({
            message: String.raw`'"after each" hook for "baz"' defined in the root suite has failed`,
          }),
        }),
        expect.objectContaining({
          name: "quux",
          status: Status.SKIPPED,
          stage: Stage.FINISHED,
          statusDetails: expect.objectContaining({
            message: String.raw`'"after each" hook for "baz"' defined in the root suite has failed`,
          }),
        }),
      ]),
    );
    const fooUuid = tests.find((t) => t.name === "foo")!.uuid;
    const barUuid = tests.find((t) => t.name === "bar")!.uuid;
    const bazUuid = tests.find((t) => t.name === "baz")!.uuid;
    const quxUuid = tests.find((t) => t.name === "qux")!.uuid;
    const quuxUuid = tests.find((t) => t.name === "quux")!.uuid;
    expect(groups).toHaveLength(5);
    expect(groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          children: [fooUuid],
          afters: [
            expect.objectContaining({
              name: String.raw`"after each" hook`,
              status: Status.PASSED,
            }),
          ],
        }),
        expect.objectContaining({
          children: [barUuid],
          afters: [
            expect.objectContaining({
              name: String.raw`"after each" hook`,
              status: Status.PASSED,
            }),
          ],
        }),
        expect.objectContaining({
          children: [bazUuid],
          afters: [
            expect.objectContaining({
              name: String.raw`"after each" hook`,
              status: Status.BROKEN,
              statusDetails: expect.objectContaining({
                message: "Lorem Ipsum",
              }),
            }),
          ],
        }),
        expect.objectContaining({
          children: [barUuid, bazUuid, quxUuid],
          afters: [
            expect.objectContaining({
              name: String.raw`"after all" hook: suite 1`,
              status: Status.PASSED,
            }),
          ],
        }),
        expect.objectContaining({
          children: [fooUuid, barUuid, bazUuid, quxUuid, quuxUuid],
          afters: [
            expect.objectContaining({
              name: String.raw`"after all" hook: spec-level`,
              status: Status.PASSED,
            }),
          ],
        }),
      ]),
    );
  });

  it("should report a failed spec-level before", async () => {
    await issue("1072");
    const { tests, groups } = await runCypressInlineTest({
      "cypress/e2e/sample.cy.js": () => `
        before(function () {
          throw new Error("Lorem Ipsum");
        });
        after(() => {
          throw new Error("Ipsum Lorem"); // doesn't overwrite the error in 'before all'
        });

        it("foo", () => {});
        describe("suite 1", () => {
          it("bar", () => {});
        });
        describe("suite 2", () => {
          it("baz", () => {});
        });
      `,
    });

    expect(tests).toHaveLength(3);
    expect(tests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "foo",
          status: Status.BROKEN,
          stage: Stage.FINISHED,
          statusDetails: expect.objectContaining({
            message: "Lorem Ipsum",
          }),
        }),
        expect.objectContaining({
          name: "bar",
          status: Status.BROKEN,
          stage: Stage.FINISHED,
          statusDetails: expect.objectContaining({
            message: "Lorem Ipsum",
          }),
        }),
        expect.objectContaining({
          name: "baz",
          status: Status.BROKEN,
          stage: Stage.FINISHED,
          statusDetails: expect.objectContaining({
            message: "Lorem Ipsum",
          }),
        }),
      ]),
    );
    const fooUuid = tests.find((t) => t.name === "foo")!.uuid;
    const barUuid = tests.find((t) => t.name === "bar")!.uuid;
    const bazUuid = tests.find((t) => t.name === "baz")!.uuid;
    expect(groups).toHaveLength(2);
    expect(groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          children: [fooUuid, barUuid, bazUuid],
          befores: [
            expect.objectContaining({
              name: String.raw`"before all" hook`,
              status: Status.BROKEN,
              statusDetails: expect.objectContaining({
                message: "Lorem Ipsum",
              }),
            }),
          ],
        }),
        expect.objectContaining({
          children: [fooUuid, barUuid, bazUuid],
          afters: [
            expect.objectContaining({
              name: String.raw`"after all" hook`,
              status: Status.BROKEN,
              statusDetails: expect.objectContaining({
                message: "Ipsum Lorem",
              }),
            }),
          ],
        }),
      ]),
    );
  });

  it("should report a failed spec-level after", async () => {
    await issue("1072");
    const { tests, groups } = await runCypressInlineTest({
      "cypress/e2e/sample.cy.js": () => `
        after(function () {
          throw new Error("Lorem Ipsum");
        });

        it("foo", () => {});
        describe("suite 1", () => {
          it("bar", () => {});
        });
        describe("suite 2", () => {
          it("baz", () => {});
        });
      `,
    });

    expect(tests).toHaveLength(3);
    expect(tests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "foo",
          status: Status.PASSED, // after/afterEach don't affect the test's status
          stage: Stage.FINISHED,
        }),
        expect.objectContaining({
          name: "bar",
          status: Status.PASSED, // after/afterEach don't affect the test's status
          stage: Stage.FINISHED,
        }),
        expect.objectContaining({
          name: "baz",
          status: Status.PASSED, // after/afterEach don't affect the test's status
          stage: Stage.FINISHED,
        }),
      ]),
    );
    const fooUuid = tests.find((t) => t.name === "foo")!.uuid;
    const barUuid = tests.find((t) => t.name === "bar")!.uuid;
    const bazUuid = tests.find((t) => t.name === "baz")!.uuid;
    expect(groups).toHaveLength(1);
    expect(groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          children: [fooUuid, barUuid, bazUuid],
          afters: [
            expect.objectContaining({
              name: String.raw`"after all" hook`,
              status: Status.BROKEN,
              statusDetails: expect.objectContaining({
                message: "Lorem Ipsum",
              }),
            }),
          ],
        }),
      ]),
    );
  });

  it("should report failed nested hooks", async () => {
    await issue("1072");
    const { tests, groups } = await runCypressInlineTest({
      "cypress/e2e/sample.cy.js": () => `
        afterEach("spec-level", () => {});
        after("spec-level", () => {});

        describe("before", () => {
          before(() => {
            throw new Error("Lorem Ipsum before");
          });
          it("foo before", () => {});
          describe("before 1", () => {
            it("bar before", () => {});
          });
          describe("before 2", () => {
            it("baz before", () => {});
          });
        });

        describe("after", () => {
          after(() => {
            throw new Error("Lorem Ipsum after");
          });
          it("foo after", () => {});
          describe("after 1", () => {
            it("bar after", () => {});
          });
          describe("after 2", () => {
            it("baz after", () => {});
          });
        });

        describe("beforeEach", () => {
          beforeEach(() => {
            throw new Error("Lorem Ipsum beforeEach");
          });
          it("foo beforeEach", () => {});
          it("bar beforeEach", () => {});
          describe("beforeEach 1", () => {
            it("baz beforeEach", () => {});
          });
          describe("beforeEach 2", () => {
            it("qux beforeEach", () => {});
          });
        });

        describe("afterEach", () => {
          afterEach(() => {
            throw new Error("Lorem Ipsum afterEach");
          });
          it("foo afterEach", () => {});
          it("bar afterEach", () => {});
          describe("afterEach 1", () => {
            it("baz afterEach", () => {});
          });
          describe("afterEach 2", () => {
            it("qux afterEach", () => {});
          });
        });
      `,
    });

    expect(tests).toHaveLength(14);
    expect(tests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "foo before",
          status: Status.BROKEN,
          stage: Stage.FINISHED,
          statusDetails: expect.objectContaining({
            message: "Lorem Ipsum before",
          }),
        }),
        expect.objectContaining({
          name: "bar before",
          status: Status.BROKEN,
          stage: Stage.FINISHED,
          statusDetails: expect.objectContaining({
            message: "Lorem Ipsum before",
          }),
        }),
        expect.objectContaining({
          name: "baz before",
          status: Status.BROKEN,
          stage: Stage.FINISHED,
          statusDetails: expect.objectContaining({
            message: "Lorem Ipsum before",
          }),
        }),
        expect.objectContaining({
          name: "foo after",
          status: Status.PASSED, // after/afterEach don't affect the test's status
          stage: Stage.FINISHED,
        }),
        expect.objectContaining({
          name: "bar after",
          status: Status.PASSED, // after/afterEach don't affect the test's status
          stage: Stage.FINISHED,
        }),
        expect.objectContaining({
          name: "baz after",
          status: Status.PASSED, // after/afterEach don't affect the test's status
          stage: Stage.FINISHED,
        }),
        expect.objectContaining({
          name: "foo beforeEach",
          status: Status.BROKEN,
          stage: Stage.FINISHED,
          statusDetails: expect.objectContaining({
            message: "Lorem Ipsum beforeEach",
          }),
        }),
        expect.objectContaining({
          name: "bar beforeEach",
          status: Status.SKIPPED,
          stage: Stage.FINISHED,
          statusDetails: expect.objectContaining({
            message: "'\"before each\" hook for \"foo beforeEach\"' defined in the 'beforeEach' suite has failed",
          }),
        }),
        expect.objectContaining({
          name: "baz beforeEach",
          status: Status.SKIPPED,
          stage: Stage.FINISHED,
          statusDetails: expect.objectContaining({
            message: "'\"before each\" hook for \"foo beforeEach\"' defined in the 'beforeEach' suite has failed",
          }),
        }),
        expect.objectContaining({
          name: "qux beforeEach",
          status: Status.SKIPPED,
          stage: Stage.FINISHED,
          statusDetails: expect.objectContaining({
            message: "'\"before each\" hook for \"foo beforeEach\"' defined in the 'beforeEach' suite has failed",
          }),
        }),
        expect.objectContaining({
          name: "foo afterEach",
          status: Status.PASSED, // after/afterEach don't affect the test's status
          stage: Stage.FINISHED,
        }),
        expect.objectContaining({
          name: "bar afterEach",
          status: Status.SKIPPED,
          stage: Stage.FINISHED,
          statusDetails: expect.objectContaining({
            message: "'\"after each\" hook for \"foo afterEach\"' defined in the 'afterEach' suite has failed",
          }),
        }),
        expect.objectContaining({
          name: "baz afterEach",
          status: Status.SKIPPED,
          stage: Stage.FINISHED,
          statusDetails: expect.objectContaining({
            message: "'\"after each\" hook for \"foo afterEach\"' defined in the 'afterEach' suite has failed",
          }),
        }),
        expect.objectContaining({
          name: "qux afterEach",
          status: Status.SKIPPED,
          stage: Stage.FINISHED,
          statusDetails: expect.objectContaining({
            message: "'\"after each\" hook for \"foo afterEach\"' defined in the 'afterEach' suite has failed",
          }),
        }),
      ]),
    );

    const fooBeforeUuid = tests.find((t) => t.name === "foo before")!.uuid;
    const barBeforeUuid = tests.find((t) => t.name === "bar before")!.uuid;
    const bazBeforeUuid = tests.find((t) => t.name === "baz before")!.uuid;
    const fooAfterUuid = tests.find((t) => t.name === "foo after")!.uuid;
    const barAfterUuid = tests.find((t) => t.name === "bar after")!.uuid;
    const bazAfterUuid = tests.find((t) => t.name === "baz after")!.uuid;
    const fooBeforeEachUuid = tests.find((t) => t.name === "foo beforeEach")!.uuid;
    const barBeforeEachUuid = tests.find((t) => t.name === "bar beforeEach")!.uuid;
    const bazBeforeEachUuid = tests.find((t) => t.name === "baz beforeEach")!.uuid;
    const quxBeforeEachUuid = tests.find((t) => t.name === "qux beforeEach")!.uuid;
    const fooAfterEachUuid = tests.find((t) => t.name === "foo afterEach")!.uuid;
    const barAfterEachUuid = tests.find((t) => t.name === "bar afterEach")!.uuid;
    const bazAfterEachUuid = tests.find((t) => t.name === "baz afterEach")!.uuid;
    const quxAfterEachUuid = tests.find((t) => t.name === "qux afterEach")!.uuid;

    expect(groups).toHaveLength(10);
    expect(groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          children: [fooBeforeUuid, barBeforeUuid, bazBeforeUuid],
          befores: [
            expect.objectContaining({
              name: String.raw`"before all" hook`,
              status: Status.BROKEN,
              statusDetails: expect.objectContaining({
                message: "Lorem Ipsum before",
              }),
            }),
          ],
        }),
        expect.objectContaining({
          children: [fooAfterUuid, barAfterUuid, bazAfterUuid],
          afters: [
            expect.objectContaining({
              name: String.raw`"after all" hook`,
              status: Status.BROKEN,
              statusDetails: expect.objectContaining({
                message: "Lorem Ipsum after",
              }),
            }),
          ],
        }),
        expect.objectContaining({
          children: [fooBeforeEachUuid],
          befores: [
            expect.objectContaining({
              name: String.raw`"before each" hook`,
              status: Status.BROKEN,
              statusDetails: expect.objectContaining({
                message: "Lorem Ipsum beforeEach",
              }),
            }),
          ],
        }),
        expect.objectContaining({
          children: [fooAfterEachUuid],
          afters: [
            expect.objectContaining({
              name: String.raw`"after each" hook`,
              status: Status.BROKEN,
              statusDetails: expect.objectContaining({
                message: "Lorem Ipsum afterEach",
              }),
            }),
          ],
        }),
        expect.objectContaining({
          children: [fooAfterUuid],
          afters: [
            expect.objectContaining({
              name: String.raw`"after each" hook: spec-level`,
              status: Status.PASSED,
            }),
          ],
        }),
        expect.objectContaining({
          children: [barAfterUuid],
          afters: [
            expect.objectContaining({
              name: String.raw`"after each" hook: spec-level`,
              status: Status.PASSED,
            }),
          ],
        }),
        expect.objectContaining({
          children: [bazAfterUuid],
          afters: [
            expect.objectContaining({
              name: String.raw`"after each" hook: spec-level`,
              status: Status.PASSED,
            }),
          ],
        }),
        expect.objectContaining({
          children: [fooBeforeEachUuid],
          afters: [
            expect.objectContaining({
              name: String.raw`"after each" hook: spec-level`,
              status: Status.PASSED,
            }),
          ],
        }),
        expect.objectContaining({
          children: [fooAfterEachUuid],
          afters: [
            expect.objectContaining({
              name: String.raw`"after each" hook: spec-level`,
              status: Status.PASSED,
            }),
          ],
        }),
        expect.objectContaining({
          children: [
            fooBeforeUuid,
            barBeforeUuid,
            bazBeforeUuid,
            fooAfterUuid,
            barAfterUuid,
            bazAfterUuid,
            fooBeforeEachUuid,
            barBeforeEachUuid,
            bazBeforeEachUuid,
            quxBeforeEachUuid,
            fooAfterEachUuid,
            barAfterEachUuid,
            bazAfterEachUuid,
            quxAfterEachUuid,
          ],
          afters: [
            expect.objectContaining({
              name: String.raw`"after all" hook: spec-level`,
              status: Status.PASSED,
            }),
          ],
        }),
      ]),
    );
  });

  it("should report the spec on spec-level after failures", async () => {
    const { tests, groups } = await runCypressInlineTest({
      "cypress/e2e/promise.cy.js": () => `
        after(() => new Cypress.Promise((_, reject) => setTimeout(() => reject(new Error("Lorem Ipsum promise")), 0)));
        it("foo", () => {});
      `,
      "cypress/e2e/sync.cy.js": () => `
        after(() => {
          throw new Error("Lorem Ipsum sync");
        });
        it("bar", () => {});
      `,
      "cypress/e2e/callback.cy.js": () => `
        after((done) => setTimeout(() => done(new Error("Lorem Ipsum callback")), 0));
        it("baz", () => {});
      `,
    });

    expect(tests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "foo",
          status: Status.PASSED,
        }),
        expect.objectContaining({
          name: "bar",
          status: Status.PASSED,
        }),
        expect.objectContaining({
          name: "baz",
          status: Status.PASSED,
        }),
      ]),
    );
    const fooUuid = tests.find((t) => t.name === "foo")!.uuid;
    const barUuid = tests.find((t) => t.name === "bar")!.uuid;
    const bazUuid = tests.find((t) => t.name === "baz")!.uuid;
    expect(groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          children: [fooUuid],
          afters: [
            expect.objectContaining({
              name: String.raw`"after all" hook`,
              status: Status.BROKEN,
              statusDetails: expect.objectContaining({
                message: "Lorem Ipsum promise",
              }),
            }),
          ],
        }),
        expect.objectContaining({
          children: [barUuid],
          afters: [
            expect.objectContaining({
              name: String.raw`"after all" hook`,
              status: Status.BROKEN,
              statusDetails: expect.objectContaining({
                message: "Lorem Ipsum sync",
              }),
            }),
          ],
        }),
        expect.objectContaining({
          children: [bazUuid],
          afters: [
            expect.objectContaining({
              name: String.raw`"after all" hook`,
              status: Status.BROKEN,
              statusDetails: expect.objectContaining({
                message: "Lorem Ipsum callback",
              }),
            }),
          ],
        }),
      ]),
    );
  });
});

it("should complete the spec from the last after hook", async () => {
  const { tests, groups } = await runCypressInlineTest({
    "cypress/e2e/promise.cy.js": () => `
      after("foo promise", () => new Cypress.Promise((resolve) => setTimeout(resolve, 0)));
      after("bar promise", () => new Cypress.Promise((resolve) => setTimeout(resolve, 0)));
      it("baz promise", () => {});
    `,
    "cypress/e2e/sync.cy.js": () => `
      after("foo sync", () => {});
      after("bar sync", () => {});
      it("baz sync", () => {});
    `,
    "cypress/e2e/callback.cy.js": () => `
      after("foo callback", (done) => setTimeout(done, 0));
      after("bar callback", (done) => setTimeout(done, 0));
      it("baz callback", () => {});
    `,
  });

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "baz promise",
        status: Status.PASSED,
      }),
      expect.objectContaining({
        name: "baz sync",
        status: Status.PASSED,
      }),
      expect.objectContaining({
        name: "baz callback",
        status: Status.PASSED,
      }),
    ]),
  );
  const promiseUuid = tests.find((t) => t.name === "baz promise")!.uuid;
  const syncUuid = tests.find((t) => t.name === "baz sync")!.uuid;
  const callbackUuid = tests.find((t) => t.name === "baz callback")!.uuid;
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        children: [promiseUuid],
        afters: [
          expect.objectContaining({
            name: String.raw`"after all" hook: foo promise`,
            status: Status.PASSED,
          }),
        ],
      }),
      expect.objectContaining({
        children: [promiseUuid],
        afters: [
          expect.objectContaining({
            name: String.raw`"after all" hook: bar promise`,
            status: Status.PASSED,
          }),
        ],
      }),
      expect.objectContaining({
        children: [syncUuid],
        afters: [
          expect.objectContaining({
            name: String.raw`"after all" hook: foo sync`,
            status: Status.PASSED,
          }),
        ],
      }),
      expect.objectContaining({
        children: [syncUuid],
        afters: [
          expect.objectContaining({
            name: String.raw`"after all" hook: bar sync`,
            status: Status.PASSED,
          }),
        ],
      }),
      expect.objectContaining({
        children: [callbackUuid],
        afters: [
          expect.objectContaining({
            name: String.raw`"after all" hook: foo callback`,
            status: Status.PASSED,
          }),
        ],
      }),
      expect.objectContaining({
        children: [callbackUuid],
        afters: [
          expect.objectContaining({
            name: String.raw`"after all" hook: bar callback`,
            status: Status.PASSED,
          }),
        ],
      }),
    ]),
  );
});
