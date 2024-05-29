import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runJasmineInlineTest } from "../utils";

it("handles jasmine hooks in flat structure", async () => {
  const { tests, groups } = await runJasmineInlineTest({
    "spec/test/sample1.spec.js": `
      afterAll(() => {});

      afterEach(() => {});

      it("should pass", () => {
        expect(true).toBe(true);
      });
    `,
    "spec/test/sample2.spec.js": `
      beforeAll(() => {});

      beforeEach(() => {});

      it("should fail", () => {
        expect(true).toBe(false);
      });
    `,
  });

  expect(tests).toHaveLength(2);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "should pass",
        status: Status.PASSED,
        stage: Stage.FINISHED,
      }),
      expect.objectContaining({
        name: "should fail",
        status: Status.FAILED,
        stage: Stage.FINISHED,
      }),
    ]),
  );
  expect(groups).toHaveLength(6);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "beforeAll",
        children: [tests[0].uuid, tests[1].uuid],
        befores: [expect.objectContaining({ status: Status.PASSED, stage: Stage.FINISHED })],
        afters: [],
      }),
      expect.objectContaining({
        name: "beforeEach",
        children: [tests[0].uuid, tests[1].uuid],
        befores: [expect.objectContaining({ status: Status.PASSED, stage: Stage.FINISHED })],
        afters: [],
      }),
      expect.objectContaining({
        name: "afterEach",
        children: [tests[0].uuid, tests[1].uuid],
        befores: [],
        afters: [expect.objectContaining({ status: Status.PASSED, stage: Stage.FINISHED })],
      }),
      expect.objectContaining({
        name: "beforeEach",
        children: [tests[0].uuid, tests[1].uuid],
        befores: [expect.objectContaining({ status: Status.PASSED, stage: Stage.FINISHED })],
        afters: [],
      }),
      expect.objectContaining({
        name: "afterEach",
        children: [tests[0].uuid, tests[1].uuid],
        befores: [],
        afters: [expect.objectContaining({ status: Status.PASSED, stage: Stage.FINISHED })],
      }),
      expect.objectContaining({
        name: "afterAll",
        children: [tests[0].uuid, tests[1].uuid],
        befores: [],
        afters: [expect.objectContaining({ status: Status.PASSED, stage: Stage.FINISHED })],
      }),
    ]),
  );
});

it("handles jasmine hooks in nested structure", async () => {
  const { tests, groups } = await runJasmineInlineTest({
    "spec/test/sample1.spec.js": `
      describe("nested 1", () => {
        beforeAll(() => {});

        afterAll(() => {});

        beforeEach(() => {});

        afterEach(() => {});

        it("should pass 1", () => {
          expect(true).toBe(true);
        });
      })
    `,
    "spec/test/sample2.spec.js": `
      describe("nested 2", () => {
        beforeAll(() => {});

        afterAll(() => {});

        beforeEach(() => {});

        afterEach(() => {});

        it("should pass 2", () => {
          expect(true).toBe(true);
        });
      })
    `,
  });

  expect(tests).toHaveLength(2);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "should pass 1",
        status: Status.PASSED,
        stage: Stage.FINISHED,
      }),
      expect.objectContaining({
        name: "should pass 2",
        status: Status.PASSED,
        stage: Stage.FINISHED,
      }),
    ]),
  );
  expect(groups).toHaveLength(8);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "beforeAll",
        children: [tests[0].uuid],
        befores: [expect.objectContaining({ status: Status.PASSED, stage: Stage.FINISHED })],
        afters: [],
      }),
      expect.objectContaining({
        name: "beforeEach",
        children: [tests[0].uuid],
        befores: [expect.objectContaining({ status: Status.PASSED, stage: Stage.FINISHED })],
        afters: [],
      }),
      expect.objectContaining({
        name: "afterEach",
        children: [tests[0].uuid],
        befores: [],
        afters: [expect.objectContaining({ status: Status.PASSED, stage: Stage.FINISHED })],
      }),
      expect.objectContaining({
        name: "afterAll",
        children: [tests[0].uuid],
        befores: [],
        afters: [expect.objectContaining({ status: Status.PASSED, stage: Stage.FINISHED })],
      }),
      expect.objectContaining({
        name: "beforeAll",
        children: [tests[1].uuid],
        befores: [expect.objectContaining({ status: Status.PASSED, stage: Stage.FINISHED })],
        afters: [],
      }),
      expect.objectContaining({
        name: "beforeEach",
        children: [tests[1].uuid],
        befores: [expect.objectContaining({ status: Status.PASSED, stage: Stage.FINISHED })],
        afters: [],
      }),
      expect.objectContaining({
        name: "afterEach",
        children: [tests[1].uuid],
        befores: [],
        afters: [expect.objectContaining({ status: Status.PASSED, stage: Stage.FINISHED })],
      }),
      expect.objectContaining({
        name: "afterAll",
        children: [tests[1].uuid],
        befores: [],
        afters: [expect.objectContaining({ status: Status.PASSED, stage: Stage.FINISHED })],
      }),
    ]),
  );
});
