import { test, expect, describe, afterAll } from "bun:test";
import { AllureBunReporter } from "../dist/reporter.js";
import type { BunTestTask } from "../dist/model.js";

const reporter = new AllureBunReporter({
  resultsDir: "./allure-results",
});

reporter.onInit();

const testResults: BunTestTask[] = [];

describe("Tests with Allure Reporter", () => {
  test("test 1 - passed", () => {
    const task: BunTestTask = {
      name: "test 1 - passed @severity:critical",
      file: "test/with-reporter.test.ts",
      state: "pass",
      duration: 10,
    };
    testResults.push(task);
    expect(1 + 1).toBe(2);
  });

  test("test 2 - passed", () => {
    const task: BunTestTask = {
      name: "test 2 - passed @epic:Demo @feature:Testing",
      file: "test/with-reporter.test.ts",
      state: "pass",
      duration: 5,
    };
    testResults.push(task);
    expect("hello".toUpperCase()).toBe("HELLO");
  });

  test("test 3 - with metadata", () => {
    const task: BunTestTask = {
      name: "test 3 - with metadata @severity:normal @owner:TestTeam",
      file: "test/with-reporter.test.ts",
      state: "pass",
      duration: 15,
    };
    testResults.push(task);
    expect(true).toBe(true);
  });
});

afterAll(() => {
  testResults.forEach((task) => {
    reporter.handleTest(task);
  });

  reporter.onComplete();
});
