import { createHash, randomUUID } from "node:crypto";
import type { EventEmitter } from "node:events";
import fs from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import type { Label, Link, Status, StepResult, TestResult } from "../../model.js";
import { LabelName, LinkType, StatusByPriority } from "../../model.js";
import type { LinkConfig, LinkTemplate } from "./types.js";
import { FileSystemWriter } from "./writer/FileSystemWriter.js";
import { MessageWriter } from "./writer/MessageWriter.js";

export const randomUuid = () => {
  return randomUUID();
};

export const md5 = (str: string) => {
  return createHash("md5").update(str).digest("hex");
};

export const FALLBACK_TEST_CASE_ID_LABEL_NAME = "_fallbackTestCaseId";

export const getFallbackTestCaseIdLabel = (value: string): Label => ({
  name: FALLBACK_TEST_CASE_ID_LABEL_NAME,
  value,
});

export const getTestResultHistoryId = (result: TestResult) => {
  if (result.historyId) {
    return result.historyId;
  }

  const tcId = result.testCaseId ?? (result.fullName ? md5(result.fullName) : null);

  if (!tcId) {
    return "";
  }

  const paramsString = result.parameters
    .filter((p) => !p?.excluded)
    .sort((a, b) => a.name?.localeCompare(b?.name) || a.value?.localeCompare(b?.value))
    .map((p) => `${p.name ?? "null"}:${p.value ?? "null"}`)
    .join(",");
  const paramsHash = md5(paramsString);

  return `${tcId}:${paramsHash}`;
};

export const getTestResultTestCaseId = (result: TestResult) => {
  return result.fullName ? md5(result.fullName) : undefined;
};

const statusToPriority = (status: Status | undefined) => {
  if (!status) {
    return -1;
  }
  return StatusByPriority.indexOf(status);
};

export const getWorstTestStepResult = (steps: StepResult[]): StepResult | undefined => {
  if (steps.length === 0) {
    return;
  }

  return [...steps].sort((a, b) => statusToPriority(a.status) - statusToPriority(b.status))[0];
};

export const readImageAsBase64 = async (filePath: string): Promise<string | undefined> => {
  try {
    const file = await readFile(filePath, { encoding: "base64" });

    return file ? `data:image/png;base64,${file}` : undefined;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`could not read file ${filePath}`, e);
    return undefined;
  }
};

export const getProjectRoot = (() => {
  const cachedProjectRootBySearchFrom = new Map<string, string>();

  const resolveSearchDir = (searchFrom?: string) => {
    const target = path.resolve(searchFrom ?? process.cwd());

    try {
      return fs.statSync(target).isFile() ? path.dirname(target) : target;
    } catch {
      return target;
    }
  };

  const resolveProjectRootByPath = (searchFrom?: string) => {
    const searchDir = resolveSearchDir(searchFrom);
    let dir = searchDir;

    while (true) {
      try {
        fs.accessSync(path.join(dir, "package.json"), fs.constants.F_OK);

        // package.json exists; use the directory as the project root
        return dir;
      } catch {}

      const parent = path.dirname(dir);

      if (parent === dir) {
        // package.json doesn't exist in any parent; fall back to the search directory
        return searchDir;
      }

      dir = parent;
    }
  };

  return (searchFrom?: string) => {
    const searchDir = resolveSearchDir(searchFrom);
    const cachedProjectRoot = cachedProjectRootBySearchFrom.get(searchDir);

    if (cachedProjectRoot) {
      return cachedProjectRoot;
    }

    const projectRoot = resolveProjectRootByPath(searchDir);

    cachedProjectRootBySearchFrom.set(searchDir, projectRoot);

    return projectRoot;
  };
})();

export const getProjectName = (() => {
  const cachedProjectNameByRoot = new Map<string, string | undefined>();

  return (searchFrom?: string): string | undefined => {
    const projectRoot = getProjectRoot(searchFrom);

    if (cachedProjectNameByRoot.has(projectRoot)) {
      return cachedProjectNameByRoot.get(projectRoot);
    }

    const packageJsonPath = path.join(projectRoot, "package.json");
    let projectName: string | undefined;

    try {
      const packageJsonContent = fs.readFileSync(packageJsonPath, "utf-8");
      const packageJson = JSON.parse(packageJsonContent);

      if (packageJson.name && typeof packageJson.name === "string") {
        projectName = packageJson.name;
      }
    } catch {}

    cachedProjectNameByRoot.set(projectRoot, projectName);

    return projectName;
  };
})();

export const getRelativePath = (filepath: string, searchFrom?: string) => {
  if (path.isAbsolute(filepath)) {
    const projectRoot = getProjectRoot(searchFrom);
    filepath = path.relative(projectRoot, filepath);
  }

  return filepath;
};

export const getPosixPath = (filepath: string) => {
  if (process.platform === "win32") {
    return filepath.replaceAll("\\", "/");
  }
  return filepath;
};

export const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

export const getSuiteLabels = (suites: readonly string[]): Label[] => {
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

const suiteLabelNames: readonly string[] = [LabelName.PARENT_SUITE, LabelName.SUITE, LabelName.SUB_SUITE];

/**
 * Resolves suite labels for the given test results and add default lables if there is no any suite label.
 * @example
 * ```ts
 * ensureSuiteLabels({ labels: [{ name: "suite", value: "foo" }] }, ["bar"]) // => [{ name: "suite", value: "foo" }]
 * ensureSuiteLabels({ labels: [] }, ["bar"]) // => [{ name: "parentSuite", value: "bar" }]
 * ```
 * @param test - Test result to resolve suite labels for
 * @param defaultSuites - Default suites to add if there is no any suite label
 * @returns Actual suite labels
 */
export const ensureSuiteLabels = (test: Partial<TestResult>, defaultSuites: readonly string[]) => {
  if (!test.labels?.find((l) => suiteLabelNames.includes(l.name))) {
    test.labels = [...(test.labels ?? []), ...getSuiteLabels(defaultSuites)];
  }

  return suiteLabelNames.map((name) => test.labels?.find((l) => l.name === name)).filter(Boolean) as Label[];
};

const reRegExpChar = /[\\^$.*+?()[\]{}|]/g,
  reHasRegExpChar = RegExp(reRegExpChar.source);

export const escapeRegExp = (value: string): string => {
  return reHasRegExpChar.test(value) ? value.replace(reRegExpChar, "\\$&") : value;
};

// TODO: may also use URL.canParse instead (requires node.js v18.17, v19.9, or higher)
const isUrl = (potentialUrl: string) => {
  // Short-circuits the check for many short URL cases, bypassing the try-catch logic.
  if (potentialUrl.indexOf(":") === -1) {
    return false;
  }

  // There is ':' in the string: a potential scheme separator.
  // The string might be a proper URL already.
  try {
    new URL(potentialUrl);
    return true;
  } catch {
    return false;
  }
};

export const applyLinkTemplate = (template: LinkTemplate, value: string) =>
  typeof template === "string" ? template.replace("%s", value) : template(value);

export const formatLink = (templates: LinkConfig, link: Link) => {
  const { url: originalUrl, name, type } = link;
  if (isUrl(originalUrl)) {
    return link;
  } else {
    const formattedLink = { ...link };
    const { urlTemplate, nameTemplate } = templates[type ?? LinkType.DEFAULT] ?? {};
    if (urlTemplate !== undefined) {
      formattedLink.url = applyLinkTemplate(urlTemplate, originalUrl);
    }
    if (name === undefined && nameTemplate !== undefined) {
      formattedLink.name = applyLinkTemplate(nameTemplate, originalUrl);
    }
    return formattedLink;
  }
};

export const formatLinks = (templates: LinkConfig, links: readonly Link[]) =>
  links.map((link) => formatLink(templates, link));

export const createDefaultWriter = (config: { resultsDir?: string; emitter?: EventEmitter }) => {
  return process.env.ALLURE_TEST_MODE
    ? new MessageWriter(config.emitter)
    : new FileSystemWriter({
        resultsDir: config.resultsDir || "./allure-results",
      });
};
