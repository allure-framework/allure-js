import { expect, it } from "vitest";
import { LabelName } from "allure-js-commons";
import { runJasmineInlineTest } from "../utils";

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
  `
  });

  expect(tests).toHaveLength(3);
  expect(tests).toEqual(expect.arrayContaining([
    expect.objectContaining({
      name: "should pass 1",
      labels: [
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
      ],
    }),
    expect.objectContaining({
      name: "should pass 2",
      labels: [
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
      ],
    }),
    expect.objectContaining({
      name: "should pass 3",
      labels: [
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
      ],
    }),
  ]));
});
