import { runMochaInlineTest } from "../../../utils";
import { beforeAll, describe, expect, it, test } from "vitest";
import { TestResult } from "allure-js-commons/new";

describe("suites", async () => {
  const testMap = new Map<string, TestResult>();

  beforeAll(async () => {
    const { tests } = await runMochaInlineTest(
      ["plain-mocha", "testInFileScope"],
      ["plain-mocha", "testInSuite"],
      ["plain-mocha", "testInTwoSuites"],
      ["plain-mocha", "testInThreeSuites"],
      ["plain-mocha", "testInFourSuites"],
      ["labels", "suites", "parentSuiteFileScope"],
      ["labels", "suites", "suiteFileScope"],
      ["labels", "suites", "subSuiteFileScope"],
      ["labels", "suites", "parentSuiteNestedScope"],
      ["labels", "suites", "suiteNestedScope"],
      ["labels", "suites", "subSuiteNestedScope"],
    );
    for (const test of tests) {
      testMap.set(test.name!, test);
    }
  });

  describe("parent suite", async () => {
    it("not defined for a file scoped test by default", async () => {
      expect(testMap.get("a test in a file scope")).not.toMatchObject({
        labels: expect.arrayContaining([{
          name: "parentSuite",
          value: expect.anything(),
        }]),
      });
    });

    test.each([
      "a test in a suite",
      "a test in two suites",
      "a test in three suites",
      "a test in four suites",
    ])("defined for %s by default", async (name) => {
      expect(testMap.get(name)).toMatchObject({
        labels: expect.arrayContaining([{
          name: "parentSuite",
          value: "foo",
        }]),
      });
    });

    describe("api", async () => {
      it("adds a parent suite label", async () => {
        expect(testMap.get("a test with a parent suite")).toMatchObject({
          labels: expect.arrayContaining([{
            name: "parentSuite",
            value: "foo",
          }]),
        });
      });

      it("overrides the default suites", async () => {
        const labels = testMap.get("a scoped test with a parent suite")!.labels;
        expect(labels).not.toContainEqual({
          name: "parentSuite",
          value: "foo",
        });
        expect(labels).not.toContainEqual({
          name: "suite",
          value: expect.anything(),
        });
        expect(labels).not.toContainEqual({
          name: "subSuite",
          value: expect.anything(),
        });
      });
    });
  });

  describe("suite", async () => {
    test.each([
      "a test in a file scope",
      "a test in a suite",
    ])("not defined for %s by default", async (name) => {
      expect(testMap.get(name)).not.toMatchObject({
        labels: expect.arrayContaining([{
          name: "suite",
          value: expect.anything(),
        }]),
      });
    });

    test.each([
      "a test in two suites",
      "a test in three suites",
      "a test in four suites",
    ])("defined for %s by default", async (name) => {
      expect(testMap.get(name)).toMatchObject({
        labels: expect.arrayContaining([{
          name: "suite",
          value: "bar",
        }]),
      });
    });

    describe("api", async () => {
      it("adds a suite label", async () => {
        expect(testMap.get("a test with a suite")).toMatchObject({
          labels: expect.arrayContaining([{
            name: "suite",
            value: "foo",
          }]),
        });
      });

      it("overrides the default suites", async () => {
        const labels = testMap.get("a scoped test with a suite")!.labels;
        expect(labels).not.toContainEqual({
          name: "parentSuite",
          value: expect.anything(),
        });
        expect(labels).not.toContainEqual({
          name: "suite",
          value: "bar",
        });
        expect(labels).not.toContainEqual({
          name: "subSuite",
          value: expect.anything(),
        });
      });
    });
  });

  describe("sub-suite", async () => {
    test.each([
      "a test in a file scope",
      "a test in a suite",
      "a test in two suites",
    ])("not defined for %s by default", async (name) => {
      expect(testMap.get(name)).not.toMatchObject({
        labels: expect.arrayContaining([{
          name: "subSuite",
          value: expect.anything(),
        }]),
      });
    });

    it("defined for a test in three suites by default", async () => {
      expect(testMap.get("a test in three suites")).toMatchObject({
        labels: expect.arrayContaining([{
          name: "subSuite",
          value: "baz",
        }]),
      });
    });

    it("defined for a test in four suites by default", async () => {
      expect(testMap.get("a test in four suites")).toMatchObject({
        labels: expect.arrayContaining([{
          name: "subSuite",
          value: "baz > qux",
        }]),
      });
    });

    describe("api", async () => {
      it("adds a subSuite label", async () => {
        expect(testMap.get("a test with a sub-suite")).toMatchObject({
          labels: expect.arrayContaining([{
            name: "subSuite",
            value: "foo",
          }]),
        });
      });

      it("overrides the default suites", async () => {
        const labels = testMap.get("a scoped test with a sub-suite")!.labels;
        expect(labels).not.toContainEqual({
          name: "parentSuite",
          value: expect.anything(),
        });
        expect(labels).not.toContainEqual({
          name: "suite",
          value: expect.anything(),
        });
        expect(labels).not.toContainEqual({
          name: "subSuite",
          value: "baz",
        });
      });
    });
  });
});
