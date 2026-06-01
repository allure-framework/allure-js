import { existsSync, mkdirSync, realpathSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { extractMetadataFromString } from "allure-js-commons/sdk";
import { getPosixPath, getProjectName, getRelativePath } from "allure-js-commons/sdk/reporter";

import { ALLURE_NODE_TEST_RUN_DIR_ENV } from "./model.js";

export const ensureRunDir = (configuredRunDir = process.env[ALLURE_NODE_TEST_RUN_DIR_ENV]) => {
  const runDir = configuredRunDir ?? mkdtempSync(join(tmpdir(), "allure-node-test-"));

  mkdirSync(runDir, { recursive: true });
  process.env[ALLURE_NODE_TEST_RUN_DIR_ENV] = runDir;

  return runDir;
};

export const normalizeFilePath = (file: string | undefined) => {
  if (!file) {
    return undefined;
  }

  try {
    if (existsSync(file)) {
      return getPosixPath(realpathSync.native(file));
    }
  } catch {
    // Ignore realpath failures and fall back to the original path.
  }

  return getPosixPath(file);
};

export const getRelativeFilePath = (file: string | undefined) => {
  const normalized = normalizeFilePath(file);

  if (!normalized) {
    return undefined;
  }

  return getPosixPath(getRelativePath(normalized));
};

export const splitNodeFullName = (fullName: string | undefined) => {
  if (!fullName) {
    return [];
  }

  return fullName
    .split(/\s*>\s*/g)
    .map((part) => part.trim())
    .filter(Boolean);
};

export const getAllureFullName = (file: string | undefined, nodeFullName: string | undefined) => {
  return getAllureFullNameFromParts(file, splitNodeFullName(nodeFullName));
};

export const getAllureFullNameFromParts = (file: string | undefined, titleParts: readonly string[]) => {
  const relativeFile = getRelativeFilePath(file);

  if (!relativeFile || !titleParts.length) {
    return undefined;
  }

  const cleanParts = [...titleParts];
  const { cleanTitle } = extractMetadataFromString(cleanParts[cleanParts.length - 1]!);

  cleanParts[cleanParts.length - 1] = cleanTitle;

  const projectName = getProjectName();
  const fileName = projectName ? `${projectName}:${relativeFile}` : relativeFile;

  return `${fileName}#${cleanParts.join(" ")}`;
};

export const getFallbackNodeFullName = (suitePath: readonly string[], name: string | undefined) => {
  return suitePath.concat(name ? [name] : []).join(" > ");
};
