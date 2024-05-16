import { createHash } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import { env } from "process";
import { ExecutableItem, Label, LabelName, Status } from "./model.js";

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

export const allureIdRegexp = /@?allure.id[:=](?<id>[^\s]+)/;
export const allureIdRegexpGlobal = new RegExp(allureIdRegexp, "g");

export const allureLabelRegexp = /@?allure.label.(?<name>[^\s]+?)[:=](?<value>[^\s]+)/;
export const allureLabelRegexpGlobal = new RegExp(allureLabelRegexp, "g");

export const getStatusFromError = (error: Error): Status => {
  switch (true) {
    /**
     * Native `node:assert` and `chai` (`vitest` uses it under the hood) throw `AssertionError`
     * `jest` throws `JestAssertionError` instance
     * `jasmine` throws `ExpectationFailed` instance
     */
    case /assert/gi.test(error.constructor.name):
    case /expectation/gi.test(error.constructor.name):
    case /assert/gi.test(error.name):
    case /assert/gi.test(error.message):
      return Status.FAILED;
    default:
      return Status.BROKEN;
  }
};

export const getSuitesLabels = (suites: string[]): Label[] => {
  if (suites.length === 0) {
    return [];
  }

  const [parentSuite, suite, ...subSuites] = suites;
  const labels: Label[] = [];

  if (parentSuite) {
    labels.push({
      name: LabelName.PARENT_SUITE,
      value: parentSuite,
    });
  }

  if (suite) {
    labels.push({
      name: LabelName.SUITE,
      value: suite,
    });
  }

  if (subSuites.length > 0) {
    labels.push({
      name: LabelName.SUB_SUITE,
      value: subSuites.join(" > "),
    });
  }

  return labels;
};

export const serialize = (val: unknown): string => {
  if (typeof val === "object" && !(val instanceof Map || val instanceof Set)) {
    return JSON.stringify(val);
  }

  if (val === undefined) {
    return "undefined";
  }

  return (val as any).toString();
};

export const extractMetadataFromString = (title: string): { labels: Label[]; cleanTitle: string } => {
  const labels = [] as Label[];

  title.split(" ").forEach((val) => {
    const idValue = val.match(allureIdRegexp)?.groups?.id;

    if (idValue) {
      labels.push({ name: LabelName.ALLURE_ID, value: idValue });
    }

    const labelMatch = val.match(allureLabelRegexp);
    const { name, value } = labelMatch?.groups || {};

    if (name && value) {
      labels?.push({ name, value });
    }
  });

  const cleanTitle = title.replace(allureLabelRegexpGlobal, "").replace(allureIdRegexpGlobal, "").trim();

  return { labels, cleanTitle };
};
