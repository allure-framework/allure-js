import { getGlobalTestRuntime } from "allure-js-commons/new/sdk/browser";
import { CypressRuntimeMessage } from "./model.js";

export const pushReportMessage = (message: CypressRuntimeMessage) => {
  const testRuntime = getGlobalTestRuntime();

  testRuntime.sendMessage(message);
};
