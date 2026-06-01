import type { ReporterConfig } from "allure-js-commons/sdk/reporter";

import { ALLURE_NODE_TEST_CONFIG_ENV } from "./model.js";

export const getNodeTestReporterConfig = (): ReporterConfig => {
  const config = parseConfigEnv();
  const resultsDir = config.resultsDir ?? process.env.ALLURE_RESULTS_DIR;

  return {
    ...config,
    resultsDir,
  };
};

const parseConfigEnv = (): ReporterConfig => {
  const value = process.env[ALLURE_NODE_TEST_CONFIG_ENV];

  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value) as ReporterConfig;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`could not parse ${ALLURE_NODE_TEST_CONFIG_ENV}`, error);
    return {};
  }
};
