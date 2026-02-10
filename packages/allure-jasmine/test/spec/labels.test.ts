import { expect, it } from "vitest";
import { LabelName } from "allure-js-commons";
import { runJasmineInlineTest } from "../utils.js";

it("should add suite labels", async () => {
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
            });

            describe("fifth suite 2", () => {
              it("should pass 2", () => {
                expect(true).toBe(true);
              });
            });

            it("should pass 3", () => {
              expect(true).toBe(true);
            });
          });
        });
      });
    });
  `,
  });

  expect(tests).toHaveLength(3);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "should pass 1",
        labels: expect.arrayContaining([
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
        ]),
      }),
      expect.objectContaining({
        name: "should pass 2",
        labels: expect.arrayContaining([
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
            value: "third suite > fourth suite > fifth suite 2",
          },
        ]),
      }),
      expect.objectContaining({
        name: "should pass 3",
        labels: expect.arrayContaining([
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
            value: "third suite > fourth suite",
          },
        ]),
      }),
    ]),
  );
});

it("should add host & thread labels", async () => {
  const { tests } = await runJasmineInlineTest({
    "spec/test/sample.spec.js": `
     describe("a suite", () => {
      it("should pass 1", () => {
      });
      it("should pass 2", () => {
      });
      it("should pass 3", () => {
      });
    });
  `,
  });

  expect(tests).toHaveLength(3);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "should pass 1",
        labels: expect.arrayContaining([
          {
            name: LabelName.HOST,
            value: expect.any(String),
          },
          {
            name: LabelName.THREAD,
            value: expect.any(String),
          },
        ]),
      }),
      expect.objectContaining({
        name: "should pass 2",
        labels: expect.arrayContaining([
          {
            name: LabelName.HOST,
            value: expect.any(String),
          },
          {
            name: LabelName.THREAD,
            value: expect.any(String),
          },
        ]),
      }),
      expect.objectContaining({
        name: "should pass 3",
        labels: expect.arrayContaining([
          {
            name: LabelName.HOST,
            value: expect.any(String),
          },
          {
            name: LabelName.THREAD,
            value: expect.any(String),
          },
        ]),
      }),
    ]),
  );
});

it("should add package label", async () => {
  const { tests } = await runJasmineInlineTest({
    "spec/test/sample.spec.js": `
     describe("a suite", () => {
      it("should pass 1", () => {
      });
      it("should pass 2", () => {
      });
      it("should pass 3", () => {
      });
    });
  `,
  });

  expect(tests).toHaveLength(3);
  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "should pass 1",
        labels: expect.arrayContaining([
          {
            name: LabelName.PACKAGE,
            value: "dummy.spec.test.sample.spec.js",
          },
        ]),
      }),
      expect.objectContaining({
        name: "should pass 2",
        labels: expect.arrayContaining([
          {
            name: LabelName.PACKAGE,
            value: "dummy.spec.test.sample.spec.js",
          },
        ]),
      }),
      expect.objectContaining({
        name: "should pass 3",
        labels: expect.arrayContaining([
          {
            name: LabelName.PACKAGE,
            value: "dummy.spec.test.sample.spec.js",
          },
        ]),
      }),
    ]),
  );
});

it("should add labels from env variables", async () => {
  const { tests } = await runJasmineInlineTest(
    {
      "spec/test/sample1.spec.js": `
      it("should pass", () => {
        expect(true).toBe(true);
      });
    `,
    },
    {
      ALLURE_LABEL_A: "a",
      ALLURE_LABEL_B: "b",
    },
  );

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toEqual(
    expect.arrayContaining([
      { name: "A", value: "a" },
      { name: "B", value: "b" },
    ]),
  );
});
