import { FixtureResult, StepResult, TestResult, TestResultContainer } from "../model.js";
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
    console.log("update test result", uuid, result);

    const currentResult = this.testResults.get(uuid);

    if (!currentResult) {
      return;
    }

    const { name, labels = [], links = [], parameters = [], attachments = [], ...rest } = result;
    const updatedResult = { ...currentResult, ...rest };

    if (name) {
      updatedResult.name = name;
    }

    updatedResult.labels.push(...labels);
    updatedResult.links.push(...links);
    updatedResult.parameters.push(...parameters);
    updatedResult.attachments.push(...attachments);

    this.testResults.set(uuid, updatedResult);
  };

  deleteTestResult = (uuid: string) => {
    this.testResults.delete(uuid);
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
    const currentStep = this.getLastStep(uuid);

    if (!currentStep) {
      return;
    }

    const { attachments = [], parameters = [], steps = [], ...rest } = result;

    currentStep.attachments.push(...attachments);
    currentStep.parameters.push(...parameters);
    currentStep.steps.push(...steps);

    Object.assign(currentStep, rest);
  };

  popStep = (uuid: string) => {
    return this.testResultsSteps.get(uuid)?.pop();
  };

  getLastStep = (uuid: string) => {
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
