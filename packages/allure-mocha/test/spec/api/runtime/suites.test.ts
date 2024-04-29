import { LabelName } from "allure-js-commons/new/sdk/node";
import { runMochaInlineTest } from "../../../utils";
import { beforeAll, describe, expect, it, test } from "vitest";
import { TestResult } from "allure-js-commons/new";

const selectSuiteLabels = (test: TestResult) =>
  test.labels.filter(l => /suite/i.test(l.name));

describe("default suite labels", async () => {
  const tests = new Map<string | undefined, TestResult>();

  beforeAll(async () => {
    const results = await runMochaInlineTest("defaultSuites");
    for (const test of results.tests) {
      tests.set(test.name, test);
    }
  });

  test.each([
    { name: "root", expectedSuites: [] },
    { name: "first", expectedSuites: [{name: "parentSuite", value: "suite 1"}] },
    { name: "second", expectedSuites: [
      {name: "parentSuite", value: "suite 1"},
      {name: "suite", value: "suite 1.1"},
    ] },
    { name: "third", expectedSuites: [
      {name: "parentSuite", value: "suite 1"},
      {name: "suite", value: "suite 1.1"},
      {name: "subSuite", value: "suite 1.1.1"},
    ] },
    { name: "fourth", expectedSuites: [
      {name: "parentSuite", value: "suite 1"},
      {name: "suite", value: "suite 1.1"},
      {name: "subSuite", value: "suite 1.1.1 > suite 1.1.1.1"},
    ] },
  ])("$name contains expected suite labels", async ({name, expectedSuites}) => {
    const test = tests.get(name);
    expect(test).toBeDefined();
    const labels = selectSuiteLabels(test!);
    expect(labels).toEqual(expectedSuites);
  });
});

describe("runtime suite labels", async () => {
  let tests: TestResult[] = [];
  beforeAll(async () => {
    ({ tests } = await runMochaInlineTest(
      "parentSuite",
      "suite",
      "subSuite",
      "noDefaultSuites",
    ));
  });

  it("contains a test with a parentSuite", async () => {
    expect(tests).toContainEqual(
      expect.objectContaining({
        name: "dynamic-parentSuite",
        labels: expect.arrayContaining([
          {
            name: LabelName.PARENT_SUITE,
            value: "foo",
          },
        ]),
      }),
    );
  });

  it("contains a test with a suite", async () => {
    expect(tests).toContainEqual(
      expect.objectContaining({
        name: "dynamic-suite",
        labels: expect.arrayContaining([
          {
            name: LabelName.SUITE,
            value: "foo",
          },
        ]),
      }),
    );
  });

  it("contains a test with a subSuite", async () => {
    expect(tests).toContainEqual(
      expect.objectContaining({
        name: "dynamic-subSuite",
        labels: expect.arrayContaining([
          {
            name: LabelName.SUB_SUITE,
            value: "foo",
          },
        ]),
      }),
    );
  });

  it("runtime suites replace default suites", async () => {
    tests.forEach((test) => {
      const suiteLabels = selectSuiteLabels(test);
      expect(suiteLabels).lengthOf(1);
    });
  });
});
