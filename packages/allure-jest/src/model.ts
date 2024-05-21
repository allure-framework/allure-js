import { JestEnvironment, JestEnvironmentConfig } from "@jest/environment";
import { Config, RuntimeMessage } from "allure-js-commons/sdk/node";

export interface AllureJestEnvironment extends JestEnvironment {
  handleAllureRuntimeMessage(payload: { currentTestName: string; message: RuntimeMessage }): void;
}

export interface AllureJestConfig extends JestEnvironmentConfig {
  projectConfig: JestEnvironmentConfig["projectConfig"] & {
    testEnvironmentOptions?: JestEnvironmentConfig["projectConfig"]["testEnvironmentOptions"] &
      Config & {
        testMode?: boolean;
      };
  };
}
