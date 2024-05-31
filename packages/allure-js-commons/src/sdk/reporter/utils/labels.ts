import { hostname } from "node:os";
import { env, pid } from "node:process";
import type { Label } from "../../../model.js";
import { LabelName } from "../../../model.js";

const ENV_LABEL_PREFIX = "ALLURE_LABEL_";

export const getEnvironmentLabels = (): Label[] => {
  const result: Label[] = [];
  for (const envKey in env) {
    if (envKey.startsWith(ENV_LABEL_PREFIX)) {
      const name = envKey.substring(ENV_LABEL_PREFIX.length).trim();
      if (name !== "") {
        result.push({ name, value: process.env[envKey]! });
      }
    }
  }
  return result;
};

let hostValue: string;

export const getHostLabel = (): Label => {
  if (!hostValue) {
    hostValue = env.ALLURE_HOST_NAME ?? hostname();
  }

  return {
    name: LabelName.HOST,
    value: hostValue,
  };
};

export const getThreadLabel = (threadId?: string): Label => {
  return {
    name: LabelName.THREAD,
    value: env.ALLURE_THREAD_NAME ?? threadId ?? pid.toString(),
  };
};
