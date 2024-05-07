import { FixtureResult, StepResult, TestResult, TestResultContainer } from "../model.js";
import { createTestResultContainer } from "./utils.js";

export class LifecycleState {
  testResults = new Map<string, TestResult>();

  stepResults = new Map<string, StepResult>();

  fixturesResults = new Map<string, FixtureResult>();

  testContainers = new Map<string, TestResultContainer>();

  getTestContainer = (uuid: string) =>
    this.testContainers.get(uuid);

  getFixture = (uuid: string) =>
    this.fixturesResults.get(uuid);

  getTest = (uuid: string) =>
    this.testResults.get(uuid);

  getStep = (uuid: string) =>
    this.stepResults.get(uuid);

  getExecutionItem = (uuid: string) =>
    this.fixturesResults.get(uuid)
      ?? this.testResults.get(uuid)
      ?? this.stepResults.get(uuid);

  // test results
  setTestResult = (uuid: string, result: TestResult) => {
    this.testResults.set(uuid, result);
  };

  deleteTestResult = (uuid: string) => {
    this.testResults.delete(uuid);
  };

  // steps
  setStepResult = (uuid: string, result: StepResult) => {
    this.stepResults.set(uuid, result);
  };

  deleteStepResult = (uuid: string) => {
    this.stepResults.delete(uuid);
  };

  // fixtures
  setFixtureResult = (uuid: string, result: FixtureResult) => {
    this.fixturesResults.set(uuid, result);
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

  deleteTestContainer = (uuid: string) => {
    this.testContainers.delete(uuid);
  };
}
