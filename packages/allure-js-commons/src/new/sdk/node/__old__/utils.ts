import { readFile } from "fs/promises";
import path from "path";
import { env } from "process";
import { Label } from "../model";

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
