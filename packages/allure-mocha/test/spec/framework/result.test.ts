import { beforeAll, describe, expect, it } from "vitest";
import type { TestResult } from "allure-js-commons";
import { SPEC_EXT, runMochaInlineTest } from "../../utils.js";

describe("defaults", () => {
  let test: TestResult;
  let sampleStart: number;
  let sampleStop: number;
  beforeAll(async () => {
    sampleStart = Date.now();
    const { tests } = await runMochaInlineTest("plain-mocha/testInFileScope");
    sampleStop = Date.now();
    test = tests[0];
  });

  it("has fullName", () => {
    const fnPattern = new RegExp(`^test/fixtures/run-results/[a-f0-9-]+/plain-mocha/testInFileScope\\.spec\\${SPEC_EXT}: a test in a file scope$`);
    expect(test.fullName).toMatch(fnPattern);
  });

  it("has historyId", () => {
    expect(test.historyId).toMatch(/^.{1,}$/);
  });

  it("has testCaseId", () => {
    expect(test.testCaseId).toMatch(/^.{1,}$/);
  });

  it("has timing props", () => {
    expect(test.start).greaterThan(0);
    expect(test.stop).greaterThan(test.start as number);
    expect(test.start).greaterThanOrEqual(sampleStart);
    expect(test.stop).lessThanOrEqual(sampleStop);
  });

  it("has default labels", () => {
    const labels = test.labels;
    const packagePattern = new RegExp(`^test\\.fixtures\\.run-results\\.[a-f0-9-]+\\.plain-mocha\\.testInFileScope\\.spec\\${SPEC_EXT}$`);
    expect(labels).toContainEqual({ name: "language", value: "javascript" });
    expect(labels).toContainEqual({ name: "framework", value: "mocha" });
    expect(labels).toContainEqual({ name: "host", value: expect.anything() });
    expect(labels).toContainEqual({
      name: "package",
      value: expect.stringMatching(packagePattern),
    });
  });
});
