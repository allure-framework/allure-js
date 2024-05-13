import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons/new/sdk/node";
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
  expect(groups).toHaveLength(1);
  expect(groups[0]).toEqual(
    expect.objectContaining({
      name: "Global",
      children: [tests[0].uuid, tests[1].uuid],
    }),
  );
  expect(groups[0].afters).toHaveLength(3);
  expect(groups[0].befores).toHaveLength(3);
});

it("handles jasmine hooks in nested structure", async () => {
  const { tests, groups } = await runJasmineInlineTest({
    "spec/test/sample1.spec.js": `
      describe("nested 1", () => {
        beforeAll(() => {});

        afterAll(() => {});

        beforeEach(() => {});

        afterEach(() => {});

        it("should pass", () => {
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

        it("should pass", () => {
          expect(true).toBe(true);
        });
      })
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
        name: "should pass",
        status: Status.PASSED,
        stage: Stage.FINISHED,
      }),
    ]),
  );
  expect(groups).toHaveLength(3);
  expect(groups).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "nested 1",
      }),
      expect.objectContaining({
        name: "nested 2",
      }),
      expect.objectContaining({
        name: "Global",
      }),
    ]),
  );

  const nested1Group = groups.find((g) => g.name === "nested 1")!;
  const nested2Group = groups.find((g) => g.name === "nested 2")!;
  const globalGroup = groups.find((g) => g.name === "Global")!;

  expect(nested1Group.children).toHaveLength(1);
  expect(nested1Group.afters).toHaveLength(2);
  expect(nested1Group.befores).toHaveLength(2);
  expect(nested2Group.children).toHaveLength(1);
  expect(nested2Group.afters).toHaveLength(2);
  expect(nested2Group.befores).toHaveLength(2);
  expect(globalGroup.children).toHaveLength(2);
  expect(globalGroup.afters).toHaveLength(0);
  expect(globalGroup.befores).toHaveLength(0);
});
