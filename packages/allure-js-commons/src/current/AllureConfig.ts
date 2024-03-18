import { TestResult } from "./model.js";
import { AllureWriter } from "./writers/index.js";

export interface AllureConfig {
  readonly resultsDir: string;
  readonly writer?: AllureWriter;
  readonly testMapper?: (test: TestResult) => TestResult | null;
}
