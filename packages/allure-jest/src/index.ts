import { AllureJestApi } from "./AllureJestApi";

export { default } from "./AllureJest";

declare global {
  const allure: AllureJestApi;
}
