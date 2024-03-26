import { FixtureResult, StepResult, TestResult, TestResultContainer } from "../model.js";

export class LifecycleState {
  testResults = new Map<string, Partial<TestResult>>();

  stepResults = new Map<string, Partial<StepResult>>();

  fixturesResults = new Map<string, Partial<FixtureResult>>();

  testContainers = new Map<string, Partial<TestResultContainer>>();

  setTestResult = (uuid: string, result: Partial<TestResult>) => {
    this.testResults.set(uuid, result);
  };

  setStepResult = (uuid: string, result: Partial<StepResult>) => {
    this.stepResults.set(uuid, result);
  };

  setFixtureResult = (uuid: string, result: Partial<FixtureResult>) => {
    this.fixturesResults.set(uuid, result);
  };

  setTestContainer = (uuid: string, container: Partial<TestResultContainer>) => {
    this.testContainers.set(uuid, container);
  };

  updateTestResult = (uuid: string, result: Partial<TestResult>) => {
    const currentResult = this.testResults.get(uuid);

    if (!currentResult) {
      return;
    }

    this.testResults.set(uuid, {
      ...currentResult,
      ...result,
    });
  };

  updateStepResult = (uuid: string, result: Partial<StepResult>) => {
    const currentResult = this.stepResults.get(uuid);

    if (!currentResult) {
      return;
    }

    this.testResults.set(uuid, {
      ...currentResult,
      ...result,
    });
  };

  updateFixtureResult = (uuid: string, result: Partial<FixtureResult>) => {
    const currentResult = this.fixturesResults.get(uuid);

    if (!currentResult) {
      return;
    }

    this.testResults.set(uuid, {
      ...currentResult,
      ...result,
    });
  };

  updateTestContainer = (uuid: string, container: Partial<TestResultContainer>) => {
    const currentContainer = this.testContainers.get(uuid);

    if (!currentContainer) {
      return;
    }

    this.testResults.set(uuid, {
      ...currentContainer,
      ...container,
    });
  };

  deleteTestResult = (uuid: string) => {
    this.testResults.delete(uuid);
  };

  deleteStepResult = (uuid: string) => {
    this.stepResults.delete(uuid);
  };

  deleteFixtureResult = (uuid: string) => {
    this.fixturesResults.delete(uuid);
  };

  deleteTestContainer = (uuid: string) => {
    this.testContainers.delete(uuid);
  };
}
