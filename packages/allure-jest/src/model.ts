import type { JestEnvironment, JestEnvironmentConfig } from "@jest/environment";
import type { Config as JestConfig } from "@jest/types";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import type { ReporterConfig } from "allure-js-commons/sdk/reporter";

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

export type AllureJestProjectConfig = JestConfig.ProjectConfig & {
  testEnvironmentOptions?: JestConfig.ProjectConfig["testEnvironmentOptions"] & ReporterConfig;
};

export type AllureJestConfig = JestEnvironmentConfig & {
  projectConfig: AllureJestProjectConfig;
};
