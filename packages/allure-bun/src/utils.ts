import type { Label, Link } from "allure-js-commons";
import { extractMetadataFromString } from "allure-js-commons/sdk";
import type { TestPlanV1 } from "allure-js-commons/sdk";
import type { BunTestTask } from "./model.js";

export const extractMetadata = (
  task: BunTestTask,
): {
  name: string;
  suitePath: string[];
  labels: Label[];
  links: Link[];
} => {
  const { cleanTitle, labels, links } = extractMetadataFromString(task.name);

  const parts = task.name.split(" > ");
  const suitePath = parts.length > 1 ? parts.slice(0, -1) : [];
  const name = cleanTitle || parts[parts.length - 1];

  return {
    name,
    suitePath,
    labels,
    links,
  };
};

export const getTestFullName = (task: BunTestTask): string => {
  const filePath = task.file.replace(/\\/g, "/");
  return `${filePath}#${task.name}`;
};

export const existsInTestPlan = (task: BunTestTask, testPlan?: TestPlanV1): boolean => {
  if (!testPlan) {
    return true;
  }

  const fullName = getTestFullName(task);
  const { tests } = testPlan;

  if (!tests || tests.length === 0) {
    return true;
  }

  return tests.some((test) => {
    if (test.selector) {
      return fullName.includes(test.selector);
    }
    return test.id === fullName;
  });
};

export const generateTestId = (task: BunTestTask): string => {
  const fullName = getTestFullName(task);
  return Buffer.from(fullName).toString("base64");
};