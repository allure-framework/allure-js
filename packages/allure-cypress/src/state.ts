import type { AllureSpecState, CypressMessage, CypressTest } from "./model.js";
import { DEFAULT_RUNTIME_CONFIG } from "./utils.js";

export const getAllureState = () => {
  let state = Cypress.env("allure") as AllureSpecState;
  if (!state) {
    state = {
      config: DEFAULT_RUNTIME_CONFIG,
      initialized: false,
      messages: [],
      testPlan: undefined,
      currentTest: undefined,
      projectDir: undefined,
    };
    Cypress.env("allure", state);
  }
  return state;
};

export const isAllureInitialized = () => getAllureState().initialized;

export const setAllureInitialized = () => {
  getAllureState().initialized = true;
};

export const getRuntimeMessages = () => getAllureState().messages;

export const setRuntimeMessages = (value: CypressMessage[]) => {
  getAllureState().messages = value;
};

export const enqueueRuntimeMessage = (message: CypressMessage) => {
  getRuntimeMessages().push(message);
};

export const getAllureTestPlan = () => getAllureState().testPlan;

export const getProjectDir = () => getAllureState().projectDir;

export const getCurrentTest = () => getAllureState().currentTest;

export const setCurrentTest = (test: CypressTest) => {
  getAllureState().currentTest = test;
};

export const dropCurrentTest = () => {
  getAllureState().currentTest = undefined;
};

export const getConfig = () => getAllureState().config;
