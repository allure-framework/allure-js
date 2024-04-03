import { AllureCypressTestRuntime } from "./commands.js";
import { CypressRuntimeMessage } from "./model.js";

export const pushReportMessage = (message: CypressRuntimeMessage) => {
  const testRuntime = Cypress.env("allureTestRuntime") as AllureCypressTestRuntime;

  testRuntime.sendMessage(message);
};
