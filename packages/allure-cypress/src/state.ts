import type { AllureSpecState, CypressMessage, CypressTest } from "./model.js";
import { defaultRuntimeConfig } from "./utils.js";

export const getAllureState = () => {
  let state = Cypress.env("allure") as AllureSpecState;
  if (!state) {
    state = {
      config: defaultRuntimeConfig,
      initialized: false,
      messages: [],
      testPlan: undefined,
      currentTest: undefined,
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

export const getCurrentTest = () => getAllureState().currentTest;

export const setCurrentTest = (test: CypressTest) => {
  getAllureState().currentTest = test;
};

export const dropCurrentTest = () => {
  getAllureState().currentTest = undefined;
};

export const getConfig = () => getAllureState().config;
