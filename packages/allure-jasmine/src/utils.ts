import { extractMetadataFromString } from "allure-js-commons/sdk";
import { getPosixPath, getRelativePath } from "allure-js-commons/sdk/reporter";

import FailedExpectation = jasmine.FailedExpectation;

export const findAnyError = (expectations?: FailedExpectation[]): FailedExpectation | null => {
  expectations = expectations || [];
  if (expectations.length > 0) {
    return expectations[0];
  }
  return null;
};

export const findMessageAboutThrow = (expectations?: FailedExpectation[]) => {
  return expectations?.find((e) => e.matcherName === "");
};

export const last = <T>(arr: readonly T[]) => (arr.length ? arr[arr.length - 1] : undefined);

export const getAllureNamesAndLabels = (
  filename: string | undefined,
  suites: readonly string[],
  rawSpecName: string,
) => {
  const filePart = filename ? getPosixPath(getRelativePath(filename)) : undefined;
  const { cleanTitle: specName, labels, links } = extractMetadataFromString(rawSpecName);
  const specPart = [...suites, specName].join(" > ");

  return {
    name: specName,
    fullName: filePart ? `${filePart}#${specPart}` : undefined,
    labels,
    links,
  };
};
