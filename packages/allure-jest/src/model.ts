import type { JestEnvironment, JestEnvironmentConfig } from "@jest/environment";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import type { Config } from "allure-js-commons/sdk/reporter";

export interface AllureJestEnvironment extends JestEnvironment {
  handleAllureRuntimeMessage(payload: { currentTestName: string; message: RuntimeMessage }): void;
}

export interface AllureJestConfig extends JestEnvironmentConfig {
  projectConfig: JestEnvironmentConfig["projectConfig"] & {
    testEnvironmentOptions?: JestEnvironmentConfig["projectConfig"]["testEnvironmentOptions"] & Config;
  };
}
