import { extractMetadataFromString } from "allure-js-commons/sdk";
import { getPosixPath, getProjectName, getRelativePath } from "allure-js-commons/sdk/reporter";

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
  const projectName = getProjectName();
  const filePart = filename ? getPosixPath(getRelativePath(filename)) : undefined;
  const { cleanTitle: specName, labels, links } = extractMetadataFromString(rawSpecName);
  const specPart = [...suites, specName].join(" > ");
  const fullNameBase = filePart ? (projectName ? `${projectName}:${filePart}` : filePart) : undefined;
  const legacyFullNameBase = filePart || undefined;
  const titlePath = filePart ? filePart.split("/").concat(suites) : undefined;
  const titlePathWithProject = titlePath && projectName ? [projectName, ...titlePath] : titlePath;

  return {
    name: specName,
    fullName: fullNameBase ? `${fullNameBase}#${specPart}` : undefined,
    legacyFullName: legacyFullNameBase ? `${legacyFullNameBase}#${specPart}` : undefined,
    titlePath: titlePathWithProject,
    labels,
    links,
  };
};
