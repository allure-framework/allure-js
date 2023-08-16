import { AllureJestAPI } from "./AllureJestAPI";

export { default } from "./AllureJest";

declare global {
  const allure: AllureJestAPI;
}
