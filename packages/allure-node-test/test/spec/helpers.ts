import type { TestResult } from "allure-js-commons";
import { expect } from "vitest";

export const getTestByName = (tests: TestResult[], name: string) => {
  const test = tests.find((entry) => entry.name === name);

  expect(test, `Expected Node test result "${name}" to be present`).toBeDefined();

  return test!;
};

export const readAttachment = (attachments: Record<string, Buffer | string>, source: string) => {
  const attachment = attachments[source];

  expect(attachment, `Expected attachment "${source}" to be present`).toBeDefined();

  return Buffer.isBuffer(attachment) ? attachment.toString("utf8") : Buffer.from(attachment, "base64").toString("utf8");
};
