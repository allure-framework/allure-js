import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "url";
import type { TestResult } from "allure-js-commons";
import { glob } from "glob";

const fileDirname = dirname(fileURLToPath(import.meta.url));

export type TestResultsByFullName = Record<string, TestResult>;

const results: TestResult[] = [];

export const getTestResult = async (testName: string) => {
  if (results.length === 0) {
    const resultsPaths = await glob([join(fileDirname, "./fixtures/allure-results/*-result.json")]);

    for (const resultPath of resultsPaths) {
      const resultFile = await readFile(resultPath, "utf-8");

      results.push(JSON.parse(resultFile) as TestResult);
    }
  }

  const testResult = results.find((result) => result.name === testName);

  if (!testResult) {
    throw new Error(`No test result found for test "${testName}"!`);
  }

  return testResult;
};
