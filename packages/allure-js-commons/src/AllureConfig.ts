import { TestResult } from "./model";

export interface IAllureConfig {
  readonly resultsDir: string;
  readonly testMapper?: (test: TestResult) => TestResult | null;
}

export class AllureConfig implements IAllureConfig {
  constructor(public readonly resultsDir: string = "allure-results",
              public readonly testMapper?: (test: TestResult) => TestResult | null) {
  }
}
