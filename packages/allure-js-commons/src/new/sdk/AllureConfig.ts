import { TestResult } from "../model.js";
import { AllureWriter } from "./AllureWriter.js";

export interface AllureConfig {
  readonly writer: AllureWriter;
  // TODO: handle lifecycle hooks here
  readonly testMapper?: (test: TestResult) => TestResult | null;
  readonly links?: {
    type: string;
    urlTemplate: string;
  }[];
}
