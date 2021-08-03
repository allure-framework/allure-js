import { createHash } from "crypto";
import { Stage, Status } from "allure-js-commons";
import { Example } from "./events/Example";

export const statusTextToAllure = (status?: string): Status => {
  if (status === "passed") {
    return Status.PASSED;
  }
  if (status === "skipped") {
    return Status.SKIPPED;
  }
  if (status === "failed") {
    return Status.FAILED;
  }
  return Status.BROKEN;
};

export const statusTextToStage = (status?: string): Stage => {
  if (status === "passed") {
    return Stage.FINISHED;
  }
  if (status === "skipped") {
    return Stage.PENDING;
  }
  if (status === "failed") {
    return Stage.INTERRUPTED;
  }
  return Stage.INTERRUPTED;
};

export const hash = (data: string): string => {
  return createHash("md5").update(data).digest("hex");
};

export const applyExample = (text: string, example: Example | undefined): string => {
  if (example === undefined) {
    return text;
  }
  for (const argName in example.arguments) {
    if (!example.arguments[argName]) {
      continue;
    }
    text = text.replace(new RegExp(`<${argName}>`, "g"), `<${example.arguments[argName]}>`);
  }
  return text;
};

/**
 * remove shortest leading indentation from all lines
 */
export const stripIndent = (data: string): string => {
  const match = data.match(/^[^\S\n]*(?=\S)/gm);

  if (match !== null) {
    const indent = Math.min(...match.map((sp) => sp.length));
    return data.replace(new RegExp(`^.{${indent}}`, "gm"), "");
  }
  return data;
};
