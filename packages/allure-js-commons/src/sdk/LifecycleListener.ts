import { StepResult, TestResult } from "../model.js";

export interface LifecycleListener {
  beforeTestResultStart?: (result: TestResult) => void;

  afterTestResultStart?: (result: TestResult) => void;

  beforeTestResultStop?: (result: TestResult) => void;

  afterTestResultStop?: (result: TestResult) => void;

  beforeTestResultUpdate?: (result: TestResult) => void;

  afterTestResultUpdate?: (result: TestResult) => void;

  beforeTestResultWrite?: (result: TestResult) => void;

  afterTestResultWrite?: (result: TestResult) => void;

  beforeStepStop?: (result: StepResult) => void;

  afterStepStop?: (result: StepResult) => void;
}

type ListenerKey = keyof LifecycleListener;

type ListenerTarget<T extends keyof LifecycleListener> = LifecycleListener[T] extends
  | ((_: infer TResult) => void)
  | undefined
  ? TResult
  : never;

export class Notifier implements LifecycleListener {
  listeners: LifecycleListener[];

  constructor({ listeners }: { listeners: LifecycleListener[] }) {
    this.listeners = [...listeners];
  }

  private callListeners = <TKey extends ListenerKey>(listenerName: TKey, result: ListenerTarget<TKey>) => {
    for (const listener of this.listeners) {
      try {
        // @ts-ignore
        listener?.[listenerName]?.(result);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`${listenerName} listener handler can't be executed due an error: `, err);
      }
    }
  };

  beforeTestResultStart = (result: TestResult) => {
    this.callListeners("beforeTestResultStart", result);
  };

  afterTestResultStart = (result: TestResult) => {
    this.callListeners("afterTestResultStart", result);
  };

  beforeTestResultStop = (result: TestResult) => {
    this.callListeners("beforeTestResultStop", result);
  };

  afterTestResultStop = (result: TestResult) => {
    this.callListeners("afterTestResultStop", result);
  };

  beforeTestResultUpdate = (result: TestResult) => {
    this.callListeners("beforeTestResultUpdate", result);
  };

  afterTestResultUpdate = (result: TestResult) => {
    this.callListeners("afterTestResultUpdate", result);
  };

  beforeTestResultWrite = (result: TestResult) => {
    this.callListeners("beforeTestResultWrite", result);
  };

  afterTestResultWrite = (result: TestResult) => {
    this.callListeners("afterTestResultWrite", result);
  };

  beforeStepStop = (result: StepResult) => {
    this.callListeners("beforeStepStop", result);
  };

  afterStepStop = (result: StepResult) => {
    this.callListeners("afterStepStop", result);
  };
}
