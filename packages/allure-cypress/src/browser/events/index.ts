import { enableScopeLevelAfterHookReporting } from "../patching.js";
import { registerCypressEventListeners } from "./cypress.js";
import { injectFlushMessageHooks, registerMochaEventListeners } from "./mocha.js";

export const enableAllure = () => {
  registerMochaEventListeners();
  registerCypressEventListeners();
  injectFlushMessageHooks();
  enableScopeLevelAfterHookReporting();
};

export { enableReportingOfCypressScreenshots } from "./cypress.js";
