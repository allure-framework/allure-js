import type { StepResult, TestResult } from "../../model.js";
import type { LifecycleListener } from "./types.js";
export declare class Notifier implements LifecycleListener {
    listeners: LifecycleListener[];
    constructor({ listeners }: {
        listeners: LifecycleListener[];
    });
    private callListeners;
    beforeTestResultStart: (result: TestResult) => void;
    afterTestResultStart: (result: TestResult) => void;
    beforeTestResultStop: (result: TestResult) => void;
    afterTestResultStop: (result: TestResult) => void;
    beforeTestResultUpdate: (result: TestResult) => void;
    afterTestResultUpdate: (result: TestResult) => void;
    beforeTestResultWrite: (result: TestResult) => void;
    afterTestResultWrite: (result: TestResult) => void;
    beforeStepStop: (result: StepResult) => void;
    afterStepStop: (result: StepResult) => void;
}
