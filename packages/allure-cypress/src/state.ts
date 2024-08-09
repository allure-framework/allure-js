import type { AllureSpecState, CypressMessage } from "./model.js";

export const getAllureState = () => {
  let state = Cypress.env("allure") as AllureSpecState;
  if (!state) {
    state = {
      initialized: false,
      messages: [],
      testPlan: undefined,
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
