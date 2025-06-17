import type { FixtureResult, StepResult, TestResult, TestResultContainer } from "../../model.js";
export declare const createTestResultContainer: (uuid: string) => TestResultContainer;
export declare const createFixtureResult: () => FixtureResult;
export declare const createStepResult: () => StepResult;
export declare const createTestResult: (uuid: string, historyUuid?: string) => TestResult;
