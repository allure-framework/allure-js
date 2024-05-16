import { beforeAll, describe, expect, it } from "vitest";
import { TestResult } from "allure-js-commons/new/sdk/node";
import { runMochaInlineTest } from "../../utils";

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
    expect(test.fullName).toMatch(
      /^test\/fixtures\/run-results\/[0-9a-f-]+\/plain-mocha\/testInFileScope\.spec\.mjs: a test in a file scope$/,
    );
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
    expect(labels).toContainEqual({ name: "language", value: "javascript" });
    expect(labels).toContainEqual({ name: "framework", value: "mocha" });
    expect(labels).toContainEqual({ name: "host", value: expect.anything() });
    expect(labels).toContainEqual({
      name: "package",
      value: expect.stringMatching(
        /^test\.fixtures\.run-results\.[0-9a-f-]+\.plain-mocha\.testInFileScope\.spec\.mjs$/,
      ),
    });
  });
});
