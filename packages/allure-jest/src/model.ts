import type { JestEnvironment, JestEnvironmentConfig } from "@jest/environment";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import type { Config } from "allure-js-commons/sdk/reporter";

export type RunContext = {
  executables: string[];
  steps: string[];
  scopes: string[];
  // TODO: do we need to define the field outside of the RunContext?
  skippedTestsFullNamesByTestPlan: string[];
};

export interface AllureJestEnvironment extends JestEnvironment {
  handleAllureRuntimeMessage(message: RuntimeMessage): void;
}

export interface AllureJestConfig extends JestEnvironmentConfig {
  projectConfig: JestEnvironmentConfig["projectConfig"] & {
    testEnvironmentOptions?: JestEnvironmentConfig["projectConfig"]["testEnvironmentOptions"] & Config;
  };
}
