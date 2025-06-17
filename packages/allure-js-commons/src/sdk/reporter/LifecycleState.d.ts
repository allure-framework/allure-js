import type { FixtureResult, StepResult, TestResult } from "../../model.js";
import type { FixtureResultWrapper, FixtureType, TestResultWrapper, TestScope } from "./types.js";
export declare class LifecycleState {
    #private;
    getScope: (uuid: string) => TestScope | undefined;
    getWrappedFixtureResult: (uuid: string) => FixtureResultWrapper | undefined;
    getFixtureResult: (uuid: string) => FixtureResult | undefined;
    getWrappedTestResult: (uuid: string) => TestResultWrapper | undefined;
    getTestResult: (uuid: string) => TestResult | undefined;
    getStepResult: (uuid: string) => StepResult | undefined;
    getExecutionItem: (uuid: string) => FixtureResult | TestResult | StepResult | undefined;
    setTestResult: (uuid: string, result: TestResult, scopeUuids?: string[]) => void;
    deleteTestResult: (uuid: string) => void;
    setStepResult: (uuid: string, result: StepResult) => void;
    deleteStepResult: (uuid: string) => void;
    setFixtureResult: (scopeUuid: string, uuid: string, type: FixtureType, result: FixtureResult) => FixtureResultWrapper;
    deleteFixtureResult: (uuid: string) => void;
    setScope: (uuid: string, data?: Partial<TestScope>) => TestScope;
    deleteScope: (uuid: string) => void;
}
