import { Label } from "../../current/model";
import { ExecutableItem, LabelName, Status } from "../model";

export const allureIdRegexp = /@?allure.id[:=](?<id>[^\s]+)/;

export const allureIdRegexpGlobal = new RegExp(allureIdRegexp, "g");

export const allureLabelRegexp = /@?allure.label.(?<name>[^\s]+?)[:=](?<value>[^\s]+)/;

export const allureLabelRegexpGlobal = new RegExp(allureLabelRegexp, "g");

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

export const extractMetadataFromString = (
  title: string,
): {
  labels: Label[];
  cleanTitle: string;
} => {
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
