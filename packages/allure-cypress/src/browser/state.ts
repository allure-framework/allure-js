import type { AllureSpecState, CypressMessage, CypressTest, StepDescriptor, StepFinalizer } from "../types.js";
import { DEFAULT_RUNTIME_CONFIG, last, toReversed } from "../utils.js";

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
      stepStack: [],
      stepsToFinalize: [],
      nextApiStepId: 0,
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

export const getStepStack = () => getAllureState().stepStack;

export const getCurrentStep = () => last(getStepStack());

export const pushStep = (step: StepDescriptor) => getStepStack().push(step);

export const popStep = () => getStepStack().pop();

export const popSteps = (index: number) => toReversed(getStepStack().splice(index));

export const popAllSteps = () => popSteps(0);

export const clearStepStack = () => {
  getAllureState().stepStack = [];
};

export const setupStepFinalization = <T extends StepDescriptor>(step: T, finalizer?: StepFinalizer) =>
  getAllureState().stepsToFinalize.push([step, finalizer]);

export const getStepsToFinalize = () => getAllureState().stepsToFinalize;

export const clearStepsToFinalize = () => {
  const state = getAllureState();
  state.stepsToFinalize = [];
};
