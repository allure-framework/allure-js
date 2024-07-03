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

it("reports failed hooks", async () => {
  const { tests, groups } = await runJestInlineTest({
    "sample.test.js": `
      beforeAll(() => {
        throw new Error("foo");
      });

      it("passed", () => {});
    `,
  });

  expect(tests).toHaveLength(0);
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
      }),
    ]),
  );
});
