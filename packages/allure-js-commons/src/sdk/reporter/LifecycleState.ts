import type { FixtureResult, StepResult, TestResult } from "../../model.js";
import type { FixtureResultWrapper, FixtureType, TestResultWrapper, TestScope } from "./types.js";

export class LifecycleState {
  #scopes = new Map<string, TestScope>();

  #testResults = new Map<string, TestResultWrapper>();

  #stepResults = new Map<string, StepResult>();

  #fixturesResults = new Map<string, FixtureResultWrapper>();

  getScope = (uuid: string) => this.#scopes.get(uuid);

  getWrappedFixtureResult = (uuid: string) => this.#fixturesResults.get(uuid);

  getFixtureResult = (uuid: string) => this.getWrappedFixtureResult(uuid)?.value;

  getWrappedTestResult = (uuid: string) => this.#testResults.get(uuid);

  getTestResult = (uuid: string) => this.getWrappedTestResult(uuid)?.value;

  getStepResult = (uuid: string) => this.#stepResults.get(uuid);

  getExecutionItem = (uuid: string): FixtureResult | TestResult | StepResult | undefined =>
    this.getFixtureResult(uuid) ?? this.getTestResult(uuid) ?? this.getStepResult(uuid);

  // test results
  setTestResult = (uuid: string, result: TestResult, scopeUuids: string[] = []) => {
    this.#testResults.set(uuid, { value: result, scopeUuids });
  };

  deleteTestResult = (uuid: string) => {
    this.#testResults.delete(uuid);
  };

  // steps
  setStepResult = (uuid: string, result: StepResult) => {
    this.#stepResults.set(uuid, result);
  };

  deleteStepResult = (uuid: string) => {
    this.#stepResults.delete(uuid);
  };

  // fixtures
  setFixtureResult = (scopeUuid: string, uuid: string, type: FixtureType, result: FixtureResult) => {
    const wrappedResult: FixtureResultWrapper = {
      uuid,
      type,
      value: result,
      scopeUuid,
    };
    this.#fixturesResults.set(uuid, wrappedResult);
    return wrappedResult;
  };

  deleteFixtureResult = (uuid: string) => {
    this.#fixturesResults.delete(uuid);
  };

  // test scopes
  setScope = (uuid: string, data: Partial<TestScope> = {}) => {
    const scope: TestScope = {
      labels: [],
      links: [],
      parameters: [],
      fixtures: [],
      tests: [],
      ...data,
      uuid,
    };
    this.#scopes.set(uuid, scope);
    return scope;
  };

  deleteScope = (uuid: string) => {
    this.#scopes.delete(uuid);
  };
}
