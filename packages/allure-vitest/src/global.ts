import { AllureVitestLegacyApi } from "./legacy.js";

declare global {
  // eslint-disable-next-line
  var allure: AllureVitestLegacyApi;
}
