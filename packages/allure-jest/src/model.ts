import type { JestEnvironment, JestEnvironmentConfig } from "@jest/environment";
import type { Circus } from "@jest/types";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import type { Config } from "allure-js-commons/sdk/reporter";

export type RunContext = {
  executables: string[];
  steps: string[];
  scopes: string[];
};

export interface AllureJestEnvironment extends JestEnvironment {
  jestState?: Circus.State;

  handleAllureRuntimeMessage(payload: {
    currentTestName?: string;
    currentSuiteId?: string;
    message: RuntimeMessage;
  }): void;
}

export interface AllureJestConfig extends JestEnvironmentConfig {
  projectConfig: JestEnvironmentConfig["projectConfig"] & {
    testEnvironmentOptions?: JestEnvironmentConfig["projectConfig"]["testEnvironmentOptions"] & Config;
  };
}
