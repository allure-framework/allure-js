import type { AllureTestCafeReporterConfig, TestCafeReporterFactory, TestCafeReporterPlugin } from "./model.js";
import { createReporterObject } from "./reporter.js";

export type { AllureTestCafeReporterConfig } from "./model.js";

export function createAllureTestCafeReporter(): TestCafeReporterPlugin;
export function createAllureTestCafeReporter(config: AllureTestCafeReporterConfig): TestCafeReporterFactory;
export function createAllureTestCafeReporter(config?: AllureTestCafeReporterConfig) {
  if (config === undefined) {
    return createReporterObject();
  }

  return () => createReporterObject(config);
}

export default createAllureTestCafeReporter;
