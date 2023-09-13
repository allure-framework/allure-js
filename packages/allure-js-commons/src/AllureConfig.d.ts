import { TestResult } from "./model";
import { AllureWriter } from "./writers";
export interface AllureConfig {
    readonly resultsDir: string;
    readonly writer?: AllureWriter;
    readonly testMapper?: (test: TestResult) => TestResult | null;
}
