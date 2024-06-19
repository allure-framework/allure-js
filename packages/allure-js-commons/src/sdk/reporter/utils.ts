import { readFile } from "fs/promises";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import properties from "properties";
import type { Status, StepResult, TestResult } from "../../model.js";
import { LabelName, StatusByPriority } from "../../model.js";
import type { Label } from "../../model.js";

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

export const getPackageLabelFromPath = (filepath: string): Label => ({
  name: LabelName.PACKAGE,
  value: getRelativePath(filepath)
    .split(path.sep)
    .filter((v) => v)
    .join("."),
});

export const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

export const serialize = (val: unknown): string => {
  if (typeof val === "object" && !(val instanceof Map || val instanceof Set)) {
    return JSON.stringify(val);
  }

  if (val === undefined) {
    return "undefined";
  }

  return (val as any).toString();
};

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
