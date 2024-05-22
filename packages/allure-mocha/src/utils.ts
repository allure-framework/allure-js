import * as Mocha from "mocha";
import { hostname } from "node:os";
import { extname, join } from "node:path";
import { env, pid } from "node:process";
import { isMainThread, threadId } from "node:worker_threads";
import { Label, LabelName } from "allure-js-commons/sdk/node";

export const getSuitesOfMochaTest = (test: Mocha.Test) => test.titlePath().slice(0, -1);

export const resolveParallelModeSetupFile = () => join(__dirname, `setupAllureMochaParallel${extname(__filename)}`);

export const resolveMochaWorkerId = () => env.MOCHA_WORKER_ID ?? (isMainThread ? pid : threadId).toString();

const allureHostName = env.ALLURE_HOST_NAME || hostname();

export const getHostLabel = (): Label => ({
  name: LabelName.HOST,
  value: allureHostName,
});

export const getWorkerIdLabel = (): Label => ({
  name: LabelName.THREAD,
  value: resolveMochaWorkerId(),
});

export const getInitialLabels = (): Label[] => [
  { name: LabelName.LANGUAGE, value: "javascript" },
  { name: LabelName.FRAMEWORK, value: "mocha" },
  getHostLabel(),
  getWorkerIdLabel(),
];
