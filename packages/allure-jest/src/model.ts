import { JestEnvironmentConfig } from "@jest/environment";
import { Config } from "allure-js-commons/new/sdk/node";

export interface AllureJestConfig extends JestEnvironmentConfig {
  projectConfig: JestEnvironmentConfig["projectConfig"] & {
    testEnvironmentOptions?: JestEnvironmentConfig["projectConfig"]["testEnvironmentOptions"] &
      Config & {
        testMode?: boolean;
      };
  };
}
