import { AllureJestApi } from "./AllureJestApi";

export type { AllureJestApi } from "./AllureJestApi";

export { AllureNodeEnv as default } from "./AllureJest";

declare global {
  const allure: AllureJestApi;
}
