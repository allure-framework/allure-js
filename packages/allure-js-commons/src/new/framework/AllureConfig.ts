import { TestResult } from "../model";
import { AllureWriter } from "./AllureWriter";

export interface AllureConfig {
  readonly writer: AllureWriter;
  readonly testMapper?: (test: TestResult) => TestResult | null;
}
