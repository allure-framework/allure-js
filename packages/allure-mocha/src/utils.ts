import type * as Mocha from "mocha";
import { dirname, extname, join } from "node:path";
import { env } from "node:process";
import { fileURLToPath } from "node:url";
import type { Label } from "allure-js-commons";
import { LabelName } from "allure-js-commons";
import { getHostLabel, getThreadLabel } from "allure-js-commons/sdk/reporter";

const filename = fileURLToPath(import.meta.url);

export const getSuitesOfMochaTest = (test: Mocha.Test) => test.titlePath().slice(0, -1);

export const resolveParallelModeSetupFile = () =>
  join(dirname(filename), `setupAllureMochaParallel${extname(filename)}`);

export const getInitialLabels = (): Label[] => [
  { name: LabelName.LANGUAGE, value: "javascript" },
  { name: LabelName.FRAMEWORK, value: "mocha" },
  getHostLabel(),
  getThreadLabel(env.MOCHA_WORKER_ID),
];
