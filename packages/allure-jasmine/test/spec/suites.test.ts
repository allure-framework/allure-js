import { expect, it } from "vitest";
import { LabelName } from "allure-js-commons";
import { runJasmineInlineTest } from "../utils.js";

it("sets labels", async () => {
  const { tests } = await runJasmineInlineTest({
    "spec/test/sample.spec.js": `
    describe("first suite", () => {
      describe("second suite", () => {
        describe("third suite", () => {
          describe("fourth suite", () => {
            describe("fifth suite", () => {
              it("should pass 1", () => {
                expect(true).toBe(true);
              });

              it("should pass 2", () => {
                expect(true).toBe(true);
              });

              it("should pass 3", () => {
                expect(true).toBe(true);
              });
            });
          });
        });
      });
    });
  `,
  });

  const expectedValue = {
    value: expect.any(String),
  };

  const testObject = [
    {
      name: LabelName.LANGUAGE,
      value: "javascript",
    },
    {
      name: LabelName.FRAMEWORK,
      value: "jasmine",
    },
    {
      name: LabelName.HOST,
      ...expectedValue,
    },
    {
      name: LabelName.PACKAGE,
      ...expectedValue,
    },
    { name: LabelName.THREAD, ...expectedValue },
    {
      name: LabelName.PARENT_SUITE,
      value: "first suite",
    },
    {
      name: LabelName.SUITE,
      value: "second suite",
    },
    {
      name: LabelName.SUB_SUITE,
      value: "third suite > fourth suite > fifth suite",
    },
  ];

  const testExpectations = tests.map(() =>
    expect.objectContaining({
      name: expect.any(String),
      labels: expect.arrayContaining(testObject),
    }),
  );

  expect(tests).toHaveLength(3);
  expect(tests).toEqual(expect.arrayContaining(testExpectations));
});
