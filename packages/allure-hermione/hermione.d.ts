import { AllureRuntime } from "allure-js-commons";

declare module "hermione" {
  export interface Hermione {
    allure: AllureRuntime;
  }
}
