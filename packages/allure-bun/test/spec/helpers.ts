import type { TestResult, TestResultContainer } from "allure-js-commons";
import { expect, it } from "vitest";

import { isBunAvailable } from "../utils.js";

export const bunIt = isBunAvailable ? it : it.skip;

export const getTestByName = (tests: TestResult[], name: string) => {
  const test = tests.find((entry) => entry.name === name);

  expect(test, `Expected Bun result "${name}" to be present`).toBeDefined();

  return test!;
};

export const getTestsByName = (tests: TestResult[], name: string) => {
  const matches = tests.filter((entry) => entry.name === name);

  expect(matches, `Expected Bun results named "${name}" to be present`).not.toHaveLength(0);

  return matches;
};

export const hasFixtureStep = (groups: TestResultContainer[], fixtureType: "befores" | "afters", stepName: string) => {
  return groups.some(
    (group) =>
      Array.isArray(group[fixtureType]) &&
      group[fixtureType].some(
        (fixture) => Array.isArray(fixture.steps) && fixture.steps.some((step) => step.name === stepName),
      ),
  );
};

export const readAttachment = (attachments: Record<string, Buffer | string>, source: string) => {
  const attachment = attachments[source];

  expect(attachment, `Expected attachment "${source}" to be present`).toBeDefined();

  return Buffer.isBuffer(attachment) ? attachment.toString("utf8") : Buffer.from(attachment, "base64").toString("utf8");
};
