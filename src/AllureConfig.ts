import { TestResult } from "./entities/TestResult";

export class AllureConfig {
	constructor(public readonly resultsDir: string = "allure-results",
				public readonly testMapper: (test: TestResult) => TestResult | null = a => a) {}
}
