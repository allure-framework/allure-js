import { readFile } from "fs/promises";
import { createHash, randomUUID } from "node:crypto";
import type { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import properties from "properties";
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

export const getWorstStepResultStatusPriority = (steps: StepResult[], priority?: number): number | undefined => {
  let worstStatusPriority = priority;

  steps.forEach((step) => {
    if (step.steps?.length) {
      worstStatusPriority = getWorstStepResultStatusPriority(step.steps, worstStatusPriority);
    }

    const stepStatusPriority = step.status ? StatusByPriority.indexOf(step.status) : undefined;

    if (stepStatusPriority === undefined) {
      return;
    }

    if (worstStatusPriority === undefined) {
      worstStatusPriority = stepStatusPriority;
      return;
    }

    if (stepStatusPriority >= worstStatusPriority) {
      return;
    }

    worstStatusPriority = stepStatusPriority;
  });

  return worstStatusPriority;
};

export const getWorstStepResultStatus = (steps: StepResult[]): Status | undefined => {
  const worstStatusPriority = getWorstStepResultStatusPriority(steps);

  if (worstStatusPriority === undefined) {
    return undefined;
  }

  return StatusByPriority[worstStatusPriority];
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

const getProjectRoot = (() => {
  let cachedProjectRoot: string | null = null;

  const resolveProjectRootByPath = () => {
    const cwd = process.cwd();
    let nextDir = cwd;
    let dir;

    do {
      dir = nextDir;
      try {
        fs.accessSync(path.join(dir, "package.json"), fs.constants.F_OK);

        // package.json exists; use the directory as the project root
        return dir;
      } catch {}

      nextDir = path.dirname(dir);
    } while (nextDir.length < dir.length);

    // package.json doesn't exist in any parent; fall back to CWD
    return cwd;
  };

  return () => {
    if (!cachedProjectRoot) {
      cachedProjectRoot = resolveProjectRootByPath();
    }
    return cachedProjectRoot;
  };
})();

export const getRelativePath = (filepath: string) => {
  if (path.isAbsolute(filepath)) {
    const projectRoot = getProjectRoot();
    filepath = path.relative(projectRoot, filepath);
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

export const ensureSuiteLabels = (test: Partial<TestResult>, defaultSuites: readonly string[]) => {
  if (!test.labels?.find((l) => suiteLabelNames.includes(l.name))) {
    test.labels = [...(test.labels ?? []), ...getSuiteLabels(defaultSuites)];
  }
};

const reRegExpChar = /[\\^$.*+?()[\]{}|]/g,
  reHasRegExpChar = RegExp(reRegExpChar.source);

export const escapeRegExp = (value: string): string => {
  return reHasRegExpChar.test(value) ? value.replace(reRegExpChar, "\\$&") : value;
};

export const parseProperties = properties.parse;
export const stringifyProperties = (data: any): string => properties.stringify(data, { unicode: true }).toString();

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
  } catch (e) {
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
