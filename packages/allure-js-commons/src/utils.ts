import { createHash } from "crypto";
import { readFile } from "fs/promises";
import { env } from "process";

import { ExecutableItem, Label, Status } from "./model";
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

export const readImageAsBase64 = async (path: string): Promise<string | undefined> => {
  try {
    const file = await readFile(path, { encoding: "base64" });
    return file ? `data:image/png;base64,${file}` : undefined;
  } catch (e) {
    return undefined;
  }
};
