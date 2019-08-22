import { TestResult } from "./model";
import { IAllureWriter } from "./writers";

export interface IAllureConfig {
  readonly resultsDir: string;
  readonly writer?: IAllureWriter;
  readonly testMapper?: (test: TestResult) => TestResult | null;
}

/**
 * @deprecated Instantiate config object directly
 */
export class AllureConfig implements IAllureConfig {
  constructor(
    public readonly resultsDir: string = "allure-results",
    public readonly testMapper?: (test: TestResult) => TestResult | null,
    public readonly writer?: IAllureWriter
  ) {}
}
