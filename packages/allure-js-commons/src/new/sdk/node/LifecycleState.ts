import { TestResult, TestResultContainer } from "../../model.js";

export class LifecycleState {
  testResults = new Map<string, Partial<TestResult>>();

  testContainers = new Map<string, Partial<TestResultContainer>>();

  // startTestResult = (uuid: string, result: Partial<TestResult>) => {
  //   // TODO deepClone
  //   this.testResults.set(uuid, { ...result });
  // };

  // updateTestResult = (uuid: string, updateFunction: (result: Partial<TestResult>) => void) => {
  //
  // }
}
