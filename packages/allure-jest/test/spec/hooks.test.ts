import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runJestInlineTest } from "../utils.js";

it("reports before and after all hooks", async () => {
  const { tests, groups } = await runJestInlineTest({
    "sample.test.js": `
      beforeAll(() => {});

      afterAll(() => {});

      it("passed 1", () => {});

      it("passed 2", () => {});
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

  expect(groups).toHaveLength(2);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "beforeAll",
        children: expect.arrayContaining([test1Uuid, test2Uuid]),
        befores: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            name: "beforeAll",
          }),
        ]),
      }),
      expect.objectContaining({
        name: "afterAll",
        children: expect.arrayContaining([test1Uuid, test2Uuid]),
        afters: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            name: "afterAll",
          }),
        ]),
      }),
    ]),
  );
});

it("reports before and after each hooks", async () => {
  const { tests, groups } = await runJestInlineTest({
    "sample.test.js": `
      beforeEach(() => {});

      afterEach(() => {});

      it("passed", () => {});
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        name: "passed",
      }),
    ]),
  );

  const [{ uuid: test1Uuid }] = tests;

  expect(groups).toHaveLength(2);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "beforeEach",
        children: expect.arrayContaining([test1Uuid]),
        befores: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            name: "beforeEach",
          }),
        ]),
      }),
      expect.objectContaining({
        name: "afterEach",
        children: expect.arrayContaining([test1Uuid]),
        afters: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            name: "afterEach",
          }),
        ]),
      }),
    ]),
  );
});

it("should report one beforeEach/afterEach per test", async () => {
  const { tests, groups } = await runJestInlineTest({
    "sample.test.js": `
      beforeEach(() => {});
      afterEach(() => {});

      it("foo", () => {});
      it("bar", () => {});
    `,
  });

  const [{ uuid: test1Uuid }, { uuid: test2Uuid }] = tests;

  expect(groups).toHaveLength(4);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "beforeEach",
        children: [test1Uuid],
      }),
      expect.objectContaining({
        name: "beforeEach",
        children: [test2Uuid],
      }),
      expect.objectContaining({
        name: "afterEach",
        children: [test1Uuid],
      }),
      expect.objectContaining({
        name: "afterEach",
        children: [test2Uuid],
      }),
    ]),
  );
});

it("should report beforeAll/afterAll for tests in sub-suites", async () => {
  const { tests, groups } = await runJestInlineTest({
    "sample.test.js": `
      beforeAll(() => {});
      afterAll(() => {});

      describe("", () => {
        it("foo", () => {});
      });
    `,
  });

  const [{ uuid: testUuid }] = tests;

  expect(groups).toHaveLength(2);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "beforeAll",
        children: [testUuid],
      }),
      expect.objectContaining({
        name: "afterAll",
        children: [testUuid],
      }),
    ]),
  );
});

it("should report failed beforeAll hooks", async () => {
  const { tests, groups } = await runJestInlineTest({
    "sample.test.js": `
      beforeAll(() => {
        throw new Error("foo");
      });

      it("test 1", () => {});
      it("test 2", () => {});
    `,
  });

  expect(tests).toHaveLength(2);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "test 1",
        status: Status.SKIPPED,
        stage: Stage.FINISHED,
        statusDetails: expect.objectContaining({
          message: "foo",
          trace: expect.any(String),
        }),
      }),

      expect.objectContaining({
        name: "test 2",
        status: Status.SKIPPED,
        stage: Stage.FINISHED,
        statusDetails: expect.objectContaining({
          message: "foo",
          trace: expect.any(String),
        }),
      }),
    ]),
  );

  expect(groups).toHaveLength(1);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "beforeAll",
        befores: expect.arrayContaining([
          expect.objectContaining({
            status: Status.BROKEN,
            statusDetails: expect.objectContaining({
              message: "foo",
              trace: expect.any(String),
            }),
            name: "beforeAll",
          }),
        ]),
        afters: [],
        children: expect.arrayContaining(tests.map((t) => t.uuid)),
      }),
    ]),
  );
});

it("should report failed beforeEach hooks", async () => {
  const { tests, groups } = await runJestInlineTest({
    "sample.test.js": `
      beforeEach(() => {
        throw new Error("foo");
      });

      it("sample test", () => {});
    `,
  });

  expect(tests).toHaveLength(1);
  const [testResult] = tests;
  expect(testResult).toEqual(
    expect.objectContaining({
      name: "sample test",
      status: Status.SKIPPED,
      stage: Stage.FINISHED,
      statusDetails: expect.objectContaining({
        message: "foo",
        trace: expect.any(String),
      }),
    }),
  );

  expect(groups).toHaveLength(1);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "beforeEach",
        befores: expect.arrayContaining([
          expect.objectContaining({
            status: Status.BROKEN,
            statusDetails: expect.objectContaining({
              message: "foo",
              trace: expect.any(String),
            }),
            name: "beforeEach",
          }),
        ]),
        afters: [],
        children: [testResult.uuid],
      }),
    ]),
  );
});

it("should report failed afterEach hooks", async () => {
  const { tests, groups } = await runJestInlineTest({
    "sample.test.js": `
      afterEach(() => {
        throw new Error("foo");
      });

      it("sample test", () => {});
    `,
  });

  expect(tests).toHaveLength(1);
  const [testResult] = tests;
  expect(testResult).toEqual(
    expect.objectContaining({
      name: "sample test",
      status: Status.PASSED,
      stage: Stage.FINISHED,
    }),
  );

  expect(groups).toHaveLength(1);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "afterEach",
        afters: expect.arrayContaining([
          expect.objectContaining({
            status: Status.BROKEN,
            statusDetails: expect.objectContaining({
              message: "foo",
              trace: expect.any(String),
            }),
            name: "afterEach",
          }),
        ]),
        befores: [],
        children: [testResult.uuid],
      }),
    ]),
  );
});

it("should report failed afterAll hooks", async () => {
  const { tests, groups } = await runJestInlineTest({
    "sample.test.js": `
      afterAll(() => {
        throw new Error("foo");
      });

      it("sample test", () => {});
    `,
  });

  expect(tests).toHaveLength(1);
  const [testResult] = tests;
  expect(testResult).toEqual(
    expect.objectContaining({
      name: "sample test",
      status: Status.PASSED,
      stage: Stage.FINISHED,
    }),
  );

  expect(groups).toHaveLength(1);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "afterAll",
        afters: expect.arrayContaining([
          expect.objectContaining({
            status: Status.BROKEN,
            statusDetails: expect.objectContaining({
              message: "foo",
              trace: expect.any(String),
            }),
            name: "afterAll",
          }),
        ]),
        befores: [],
        children: [testResult.uuid],
      }),
    ]),
  );
});

it("should support steps in beforeAll hooks", async () => {
  const { tests, groups } = await runJestInlineTest({
    "sample.test.js": `
      const { logStep } = require("allure-js-commons");

      beforeAll(async () => {
        await logStep("step 1");
        await logStep("step 2");
      });

      it("passed 1", () => {});

      it("passed 2", () => {});
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

  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "beforeAll",
        children: expect.arrayContaining([test1Uuid, test2Uuid]),
        befores: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            name: "beforeAll",
            steps: [
              expect.objectContaining({
                name: "step 1",
              }),
              expect.objectContaining({
                name: "step 2",
              }),
            ],
          }),
        ]),
      }),
    ]),
  );
});

it("should support steps in afterAll hooks", async () => {
  const { tests, groups } = await runJestInlineTest({
    "sample.test.js": `
      const { logStep } = require("allure-js-commons");

      afterAll(async () => {
        await logStep("step 1");
        await logStep("step 2");
      });

      it("passed 1", () => {});

      it("passed 2", () => {});
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

  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "afterAll",
        children: expect.arrayContaining([test1Uuid, test2Uuid]),
        afters: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            name: "afterAll",
            steps: [
              expect.objectContaining({
                name: "step 1",
              }),
              expect.objectContaining({
                name: "step 2",
              }),
            ],
          }),
        ]),
      }),
    ]),
  );
});

it("should support steps in beforeEach hooks", async () => {
  const { tests, groups } = await runJestInlineTest({
    "sample.test.js": `
      const { logStep } = require("allure-js-commons");

      beforeEach(async () => {
        await logStep("step 1");
        await logStep("step 2");
      });

      it("passed 1", () => {});

      it("passed 2", () => {});
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

  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "beforeEach",
        children: expect.arrayContaining([test1Uuid]),
        befores: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            name: "beforeEach",
            steps: [
              expect.objectContaining({
                name: "step 1",
              }),
              expect.objectContaining({
                name: "step 2",
              }),
            ],
          }),
        ]),
      }),
      expect.objectContaining({
        name: "beforeEach",
        children: expect.arrayContaining([test2Uuid]),
        befores: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            name: "beforeEach",
            steps: [
              expect.objectContaining({
                name: "step 1",
              }),
              expect.objectContaining({
                name: "step 2",
              }),
            ],
          }),
        ]),
      }),
    ]),
  );
});

it("should support labels in beforeEach hooks", async () => {
  const { tests } = await runJestInlineTest({
    "sample.test.js": `
      const { label } = require("allure-js-commons");

      beforeEach(async () => {
        await label("feature", "value 1");
        await label("story", "value 2");
      });

      it("passed 1", () => {});

      it("passed 2", () => {});
    `,
  });

  expect(tests).toHaveLength(2);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: Status.PASSED,
        name: "passed 1",
        labels: expect.arrayContaining([
          {
            name: "feature",
            value: "value 1",
          },
          {
            name: "story",
            value: "value 2",
          },
        ]),
      }),
      expect.objectContaining({
        status: Status.PASSED,
        name: "passed 2",
        labels: expect.arrayContaining([
          {
            name: "feature",
            value: "value 1",
          },
          {
            name: "story",
            value: "value 2",
          },
        ]),
      }),
    ]),
  );
});

it("should support steps in afterEach hooks", async () => {
  const { tests, groups } = await runJestInlineTest({
    "sample.test.js": `
      const { logStep } = require("allure-js-commons");

      afterEach(async () => {
        await logStep("step 1");
        await logStep("step 2");
      });

      it("passed 1", () => {});

      it("passed 2", () => {});
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

  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "afterEach",
        children: expect.arrayContaining([test1Uuid]),
        afters: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            name: "afterEach",
            steps: [
              expect.objectContaining({
                name: "step 1",
              }),
              expect.objectContaining({
                name: "step 2",
              }),
            ],
          }),
        ]),
      }),
      expect.objectContaining({
        name: "afterEach",
        children: expect.arrayContaining([test2Uuid]),
        afters: expect.arrayContaining([
          expect.objectContaining({
            status: Status.PASSED,
            name: "afterEach",
            steps: [
              expect.objectContaining({
                name: "step 1",
              }),
              expect.objectContaining({
                name: "step 2",
              }),
            ],
          }),
        ]),
      }),
    ]),
  );
});
