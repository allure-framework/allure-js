import { TestResult, TestResultContainer } from "../../model.js";

export class LifecycleState {
  testResults = new Map<string, Partial<TestResult>>();

  testContainers = new Map<string, Partial<TestResultContainer>>();

  addTestResult = (uuid: string, result: Partial<TestResult>) => {
    this.testResults.set(uuid, result);
  };

  addTestContainer = (uuid: string, container: Partial<TestResultContainer>) => {
    this.addTestContainer(uuid, container);
  };

  updateTestResult = async (uuid: string, updateFunction: (result: Partial<TestResult>) => void | Promise<void>) => {
    const result = this.testResults.get(uuid);

    if (!result) {
      return;
    }

    await updateFunction(result);
  };

  updateContainerResult = async (
    uuid: string,
    updateFunction: (result: Partial<TestResultContainer>) => void | Promise<void>,
  ) => {
    const result = this.testContainers.get(uuid);

    if (!result) {
      return;
    }

    await updateFunction(result);
  };

  deleteTestResult = (uuid: string) => {
    this.testResults.delete(uuid);
  };

  deleteTestContainer = (uuid: string) => {
    this.testContainers.delete(uuid);
  };
}
