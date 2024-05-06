import { FixtureResult, Stage, StepResult, TestResult, TestResultContainer } from "../model.js";
import { Stack } from "../utils.js";
import { createFixtureResult, createStepResult, createTestResult, createTestResultContainer } from "./utils.js";

export class LifecycleState {
  testResults = new Map<string, TestResult>();

  testResultsSteps = new Map<string, Stack<StepResult>>();

  fixturesResults = new Map<string, FixtureResult>();

  testContainers = new Map<string, TestResultContainer>();

  // test results
  setTestResult = (uuid: string, result: Partial<TestResult>) => {
    this.testResults.set(uuid, {
      ...createTestResult(uuid),
      ...result,
    });
  };

  updateTestResult = (uuid: string, result: Partial<TestResult>) => {
    const currentResult = this.testResults.get(uuid);

    if (!currentResult) {
      return;
    }

    const { name, labels = [], links = [], parameters = [], attachments = [], steps = [], ...rest } = result;
    const updatedResult = { ...currentResult };

    if (name) {
      updatedResult.name = name;
    }

    updatedResult.labels.push(...labels);
    updatedResult.links.push(...links);
    updatedResult.attachments.push(...attachments);
    updatedResult.parameters.push(...parameters);
    updatedResult.steps.push(...steps);

    Object.assign(updatedResult, rest);

    this.testResults.set(uuid, updatedResult);
  };

  deleteTestResult = (uuid: string) => {
    this.testResults.delete(uuid);
    this.testResultsSteps.delete(uuid);
  };

  // steps
  setStepResult = (uuid: string, result: Partial<StepResult>) => {
    if (!this.testResultsSteps.has(uuid)) {
      this.testResultsSteps.set(uuid, new Stack());
    }

    this.testResultsSteps.get(uuid)!.push({
      ...createStepResult(),
      ...result,
    });
  };

  updateCurrentStep = (uuid: string, result: Partial<StepResult>) => {
    const currentStep = this.getCurrentStep(uuid);

    if (!currentStep) {
      return;
    }

    const { status, stage, statusDetails, attachments = [], steps = [], parameters = [], ...rest } = result;

    // don't override status if it's already set
    if (!currentStep.status) {
      currentStep.status = status;
    }

    // don't override stage if it's already set
    if (currentStep.stage !== Stage.PENDING && stage) {
      currentStep.stage = stage;
    }

    // don't override status details if it's already set
    if (!currentStep.statusDetails && statusDetails) {
      currentStep.statusDetails = statusDetails;
    }

    currentStep.attachments.push(...attachments);
    currentStep.steps.push(...steps);
    currentStep.parameters.push(...parameters);

    Object.assign(currentStep, rest);
  };

  popStep = (uuid: string) => {
    return this.testResultsSteps.get(uuid)?.pop();
  };

  getCurrentStep = (uuid: string) => {
    return this.testResultsSteps.get(uuid)?.last;
  };

  getFirstStep = (uuid: string) => {
    return this.testResultsSteps.get(uuid)?.first;
  };

  // fixtures
  setFixtureResult = (uuid: string, result: Partial<FixtureResult>) => {
    this.fixturesResults.set(uuid, {
      ...createFixtureResult(),
      ...result,
    });
  };

  updateFixtureResult = (uuid: string, result: Partial<FixtureResult>) => {
    const currentResult = this.fixturesResults.get(uuid);

    if (!currentResult) {
      return;
    }

    Object.assign(currentResult, result);
  };

  deleteFixtureResult = (uuid: string) => {
    this.fixturesResults.delete(uuid);
  };

  // test containers
  setTestContainer = (uuid: string, container: Partial<TestResultContainer>) => {
    this.testContainers.set(uuid, {
      ...createTestResultContainer(uuid),
      ...container,
    });
  };

  updateTestContainer = (uuid: string, container: Partial<TestResultContainer>) => {
    const currentContainer = this.testContainers.get(uuid);

    if (!currentContainer) {
      return;
    }

    Object.assign(currentContainer, container);
  };

  deleteTestContainer = (uuid: string) => {
    this.testContainers.delete(uuid);
  };
}
