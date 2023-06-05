import { createHash } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import { env } from "process";
import { AllureTest } from "./AllureTest";
import { ExecutableItem, Label, LabelName, Status } from "./model";

export const md5 = (data: string) => createHash("md5").update(data).digest("hex");

export const getLabelsFromEnv = (): Label[] => {
  const envKeys = Object.keys(env);
  const labels: Label[] = [];

  envKeys.forEach((key) => {
    const labelRegexp = /^ALLURE_LABEL_(?<labelName>.+)$/;
    const match = key.match(labelRegexp);
    if (match) {
      const labelName = match.groups?.labelName;
      const envValue = process.env[key];
      if (labelName && envValue) {
        labels.push({ name: labelName.toLocaleLowerCase(), value: envValue });
      }
    }
  });

  return labels;
};

const reRegExpChar = /[\\^$.*+?()[\]{}|]/g,
  reHasRegExpChar = RegExp(reRegExpChar.source);

export const escapeRegExp = (value: string): string => {
  return reHasRegExpChar.test(value) ? value.replace(reRegExpChar, "\\$&") : value;
};

export const isAnyStepFailed = (item: ExecutableItem): boolean => {
  const isFailed = item.status === Status.FAILED;

  if (isFailed || item.steps.length === 0) {
    return isFailed;
  }

  return !!item.steps.find((step) => isAnyStepFailed(step));
};

export const isAllStepsEnded = (item: ExecutableItem): boolean => {
  return item.steps.every((val) => val.stop && isAllStepsEnded(val));
};

export const readImageAsBase64 = async (filePath: string): Promise<string | undefined> => {
  try {
    const file = await readFile(filePath, { encoding: "base64" });
    return file ? `data:image/png;base64,${file}` : undefined;
  } catch (e) {
    return undefined;
  }
};

const asciiRegex = new RegExp(
  "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))", // eslint-disable-line no-control-regex
  "g",
);

export const stripAscii = (str: string): string => {
  return str.replace(asciiRegex, "");
};

export const allureReportFolder = (outputFolder?: string): string => {
  if (process.env.ALLURE_RESULTS_DIR) {
    return path.resolve(process.cwd(), process.env.ALLURE_RESULTS_DIR);
  }
  if (outputFolder) {
    return outputFolder;
  }
  return defaultReportFolder();
};

export const defaultReportFolder = (): string => {
  return path.resolve(process.cwd(), "allure-results");
};

export const allureIdRegexp = /^@?allure.id[:=](?<id>.+)$/;
export const allureLabelRegexp = /@?allure.label.(?<name>.+?)[:=](?<value>.+)/;

export const getStatusFromError = (error: Error): Status => {
  switch (true) {
    /**
     * Native `node:assert` and `chai` (`vitest` uses it under the hood) throw `AssertionError`
     * `jest` throws `JestAssertionError` instance
     */
    case /assert/gi.test(error.constructor.name):
    case /assert/gi.test(error.name):
    case /assert/gi.test(error.message):
      return Status.FAILED;
    default:
      return Status.BROKEN;
  }
};

/**
 * Assings possible suites labels from the given path to a given test (mutates the test)
 * and returns it
 *
 * @param test
 * @param suites
 * @param skipLabels
 */
export const assignSuitesLabels = (
  test: AllureTest,
  suites: string[],
  skipLabels: (LabelName | boolean | null | undefined)[] = [],
) => {
  if (suites.length === 0) {
    return test;
  }

  const [parentSuite, suite, ...subSuites] = suites;
  const skipLabel = (label: LabelName) => skipLabels.filter(Boolean).includes(label);

  if (parentSuite && !skipLabel(LabelName.PARENT_SUITE)) {
    test.addLabel(LabelName.PARENT_SUITE, parentSuite);
  }

  if (suite && !skipLabel(LabelName.SUITE)) {
    test.addLabel(LabelName.SUITE, suite);
  }

  if (subSuites.length > 0 && !skipLabel(LabelName.SUB_SUITE)) {
    test.addLabel(LabelName.SUB_SUITE, subSuites.join(" > "));
  }

  return test;
};
